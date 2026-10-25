const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const loaded={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/request-origin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(loaded,loaded.exports);
const {assertSameOrigin}=loaded.exports;
test('origin uses requested host when Next binds to a different local address',()=>{
  for (const host of ['localhost:3100','127.0.0.1:3100']) {
    assert.doesNotThrow(()=>assertSameOrigin(new Headers({host,origin:'http://'+host}),'http://127.0.0.1:3100/api/installation'));
  }
});
test('foreign origins, ports, schemes and forwarded-header spoofing are rejected',()=>{
  for (const origin of ['http://evil.test','http://localhost:3101','https://localhost:3100','null','http://localhost:3100/']) {
    assert.throws(()=>assertSameOrigin(new Headers({host:'localhost:3100',origin,'x-forwarded-host':'evil.test'}),'http://127.0.0.1:3100/api/installation'),/Origine/);
  }
});
