const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, resolve = require) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; new Function('require', 'module', 'exports', compiled)(resolve, module, module.exports); return module.exports;
}
const types = load('src/types/esecef.ts');
const { ESECeFService } = load('src/lib/esecef.service.ts', name => name === '@/types/esecef' ? types : require(name));
const { TokenCrypto } = load('src/lib/token-crypto.ts');
const key = 'a'.repeat(64);
test('AES-GCM: secret round-trip, random ciphertext, tamper and wrong key rejected', () => {
  const one = TokenCrypto.encrypt('secret-test-token', key), two = TokenCrypto.encrypt('secret-test-token', key);
  assert.notEqual(one, two); assert.equal(TokenCrypto.decrypt(one, key), 'secret-test-token');
  assert.ok(!one.includes('secret-test-token'));
  const pieces = one.split('.'); pieces[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => TokenCrypto.decrypt(pieces.join('.'), key)); assert.throws(() => TokenCrypto.decrypt(one, 'b'.repeat(64)));
  assert.throws(() => TokenCrypto.decrypt(Buffer.from('secret').toString('base64'), key)); assert.throws(() => TokenCrypto.encrypt('token', 'weak'));
});
const invoice = { nif: '12345', isf: 'TEST-ISF', type: 'FV', mode: 'ttc', operator: { name: 'Opérateur test' }, items: [{ name: 'Article test', price: 750, quantity: 1, taxGroup: 'A' }], payment: [{ name: 'ESPECES', amount: 750 }] };
const status = { status: true, pendingRequestsCount: 0 };
const security = { codeSECeFDGI: 'CODE-TEST', qrCode: 'QR-TEST', nim: 'NIM-TEST', counters: '1/1 FV', dateTime: '14/10/2026 17:00:00' };
function mock(responses) {
  const calls = []; let idx = 0;
  global.fetch = async (url, init) => { calls.push({ url, ...init }); return new Response(JSON.stringify(responses[idx++]), { status: 200 }); };
  return calls;
}
const service = () => new ESECeFService({ baseURL: '', token: 'secret-test-token', timeout: 1000 }, 'test');
test('API protocol: raw Authorization, POST then PUT confirm, UID persisted first', async () => {
  const calls = mock([status, { uid: 'uid-test', total: 750 }, security]); let persisted = false;
  const result = await service().certifyInvoice(invoice, r => r.total === 750, async r => { assert.equal(calls.length, 2); assert.equal(r.uid, 'uid-test'); persisted = true; });
  assert.equal(result.success, true); assert.equal(persisted, true); assert.equal(result.nim, security.nim); assert.equal(result.uid, 'uid-test');
  assert.deepEqual(calls.map(c => c.method), ['GET', 'POST', 'PUT']); assert.ok(calls[2].url.endsWith('/uid-test/confirm')); assert.equal(calls[1].headers.Authorization, 'secret-test-token'); assert.equal(JSON.parse(calls[1].body).items[0].price, 750);
});
test('API business error in HTTP 200 never confirms', async () => {
  const calls = mock([status, { errorCode: '99', errorDesc: 'Test de rejet' }]); const result = await service().certifyInvoice(invoice);
  assert.equal(result.success, false); assert.equal(calls.length, 2);
});
test('missing UID or incomplete security never reports certification', async () => {
  mock([status, { total: 750 }]); assert.equal((await service().certifyInvoice(invoice)).success, false);
  mock([status, { uid: 'uid-test', total: 750 }, { codeSECeFDGI: 'code', qrCode: 'qr' }]); assert.equal((await service().certifyInvoice(invoice)).success, false);
});
test('total mismatch uses PUT cancel and never confirms', async () => {
  const calls = mock([status, { uid: 'uid-test', total: 999 }, {}]); const result = await service().certifyInvoice(invoice, r => r.total === 750);
  assert.equal(result.success, false); assert.equal(result.error.code, 'VALIDATION_FAILED'); assert.ok(calls[2].url.endsWith('/uid-test/cancel'));
});
test('UID persistence failure prevents confirmation', async () => {
  const calls = mock([status, { uid: 'uid-test', total: 750 }]); const result = await service().certifyInvoice(invoice, undefined, async () => { throw new Error('Database unavailable'); });
  assert.equal(result.success, false); assert.equal(calls.length, 2);
});
test('money is rounded in FCFA and mobile money is mapped', () => { assert.equal(ESECeFService.toApiAmount(750.4), 750); assert.equal(ESECeFService.toApiAmount(750.5), 751); assert.equal(ESECeFService.mapPaymentType('mobilemoney'), 'MOBILEMONEY'); });
test('failed cancellation on total mismatch is uncertain and needs reconciliation', async () => {
  const calls = mock([status, { uid: 'uid-test', total: 999 }, { errorCode: '20', errorDesc: 'Déjà finalisée' }]);
  const result = await service().certifyInvoice(invoice, r => r.total === 750);
  assert.equal(result.success, false); assert.equal(result.error.code, 'EXCEPTION'); assert.equal(calls.length, 3);
});
