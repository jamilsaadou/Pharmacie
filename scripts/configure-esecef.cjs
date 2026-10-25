const fs = require('node:fs'); const crypto = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();
async function main() {
  let input = ''; for await (const chunk of process.stdin) input += chunk;
  const { token, isf } = JSON.parse(input);
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  const [nif, nim] = payload.name.split('|');
  if (!nif || !nim || token.split('.').length !== 3) throw new Error('Jeton invalide.');
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv); const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const secret = ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
  const environnement = nim.startsWith('ET') ? 'test' : 'production';
  const config = await prisma.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(742019)`; await tx.configurationESECeF.updateMany({ where: { actif: true }, data: { actif: false } }); return tx.configurationESECeF.upsert({ where: { nim }, create: { nif, nim, isf, environnement, token: secret, actif: true }, update: { token: secret, isf, actif: true, tokenValidUntil: null, lastTokenCheck: null } }); });
  console.log('Jeton chiffré enregistré dans PostgreSQL. Environnement : '+environnement+'.');
  const host = environnement === 'test' ? 'https://esecef-test.impots.gouv.ne' : 'https://esecef.impots.gouv.ne';
  const get = async path => { const r=await fetch(host+path,{headers:{Authorization:token,Accept:'application/json'},signal:AbortSignal.timeout(20000)}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); };
  try {
    const [status,info,taxes,invoiceTypes,paymentTypes] = await Promise.all(['/api/invoice','/api/info/status','/api/info/taxGroups','/api/info/invoiceTypes','/api/info/paymentTypes'].map(get));
    const counter=info.emcfList?.find(e=>e.nim===nim&&e.status==='Actif');
    if (!status.status || status.nif!==nif || status.nim!==nim || !counter || new Date(status.tokenValid)<=new Date()) throw new Error('Identité ou validité non confirmée');
    await prisma.configurationESECeF.update({where:{id:config.id},data:{tokenValidUntil:new Date(status.tokenValid),lastTokenCheck:new Date(),derniereSynchro:new Date(),nomEtablissement:counter.shopName||'',adresse:[counter.address1,counter.address2,counter.address3].filter(Boolean).join(', '),catalogueFiscal:{taxes,invoiceTypes,paymentTypes}}});
    console.log('Connexion DGI vérifiée, identité du compteur confirmée, référentiels synchronisés. Aucune facture créée.');
  } catch { console.log('Configuration enregistrée ; vérification DGI non achevée. Utilisez Tester & synchroniser dans les paramètres.'); }
}
main().catch(() => { console.error('Configuration non achevée. Aucun secret affiché.'); process.exitCode=1; }).finally(()=>prisma.$disconnect());
