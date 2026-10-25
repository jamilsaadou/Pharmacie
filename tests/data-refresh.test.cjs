const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/data-refresh.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {fetchWithRefresh,subscribeDataRefresh,notifyDataChanged}=mod.exports;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('writes notify only on successful mutations and leave the response readable',async()=>{
 global.window=new EventTarget();window.localStorage={setItem(){}};const original=global.fetch;let changed=0;window.addEventListener('pharmacare:data-changed',()=>changed++);
 try {global.fetch=async()=>new Response('{"saved":true}',{status:200});assert.deepEqual(await(await fetchWithRefresh('/api/commandes',{method:'PATCH'})).json(),{saved:true});assert.equal(changed,1);await fetchWithRefresh('/api/medicaments');assert.equal(changed,1);global.fetch=async()=>new Response('{}',{status:400});await fetchWithRefresh('/api/medicaments',{method:'POST'});assert.equal(changed,1);}finally{global.fetch=original;delete global.window;}
});
test('refresh coalesces writes, handles another tab/reconnection and unsubscribes',async()=>{
 global.window=new EventTarget();window.localStorage={setItem(){}};global.document=new EventTarget();document.visibilityState='visible';let calls=0;const off=subscribeDataRefresh(async()=>{calls++;});
 try{notifyDataChanged();notifyDataChanged();await pause(110);assert.equal(calls,1);const storage=new Event('storage');storage.key='pharmacare:data-revision';window.dispatchEvent(storage);window.dispatchEvent(new Event('online'));await pause(110);assert.equal(calls,2);off();notifyDataChanged();await pause(110);assert.equal(calls,2);}finally{off();delete global.window;delete global.document;}
});
test('a change during an ongoing refresh queues a new read without overlap',async()=>{
 global.window=new EventTarget();window.localStorage={setItem(){}};global.document=new EventTarget();let calls=0,release;const off=subscribeDataRefresh(async()=>{calls++;if(calls===1)await new Promise(r=>release=r);});
 try{notifyDataChanged();await pause(110);notifyDataChanged();await pause(110);assert.equal(calls,1);release();await pause(110);assert.equal(calls,2);}finally{off();delete global.window;delete global.document;}
});
