// Authorized DGI sandbox tests from SFE version 3. Never changes business stock.
const fs=require('node:fs'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{scryptSync}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const source=new PrismaClient();const name='pharmacare_sfe_v3_20261019',out='output/homologation-ab-20261022';fs.mkdirSync(out,{recursive:true});const file=out+'/resultats.json';let rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[],db,server,cookie='';
const ts=require('typescript'), numberingModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/invoice-number.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,numberingModule,numberingModule.exports);
const persist=()=>fs.writeFileSync(file,JSON.stringify(rows,null,2));
async function api(path,body){const r=await fetch('http://127.0.0.1:3103'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return{status:r.status,data:await r.json(),headers:r.headers};}
const client={nif:'1111',name:'Pharmacie du Fleuve (TEST)'},named={name:'Clinique de la Concorde (TEST)'};
const line=(g,q,extra={})=>({code:'AB-'+g,name:g==='A'?'Paracétamol 500 mg (TEST)':'Gel hydroalcoolique 250 ml (TEST)',price:g==='A'?800:1190,quantity:q,taxGroup:g,...extra});
const stamp={code:'TIMBRE',name:'Timbre',price:200,quantity:1,taxGroup:'L'};
const plans=[
[50,[line('B',2,{price:1071,originalPrice:1190,priceModification:'Remise 10%'}),line('A',3,{price:1200,originalPrice:1300,priceModification:'Remise totale de 300 FCFA'}),stamp],{client,isb:'A'}],
[1,[line('A',1)],{client:named}],
[3,[line('B',2),line('A',3)],{client:named}],
[9,[line('B',2),line('A',3)],{client:named,isb:'B'}],
[10,[line('B',2),line('A',3)],{client,isb:'A'}],
[26,[line('A',1,{price:1000}),line('B',1,{price:6000}),stamp],{client}],
[30,[line('B',3),line('A',2)],{client}],
[31,[line('B',2,{price:7000,originalPrice:8000,priceModification:'Remise 12,5%'}),line('A',1)],{client}],
[32,[line('B',3,{price:1090,originalPrice:1190,priceModification:'Remise totale de 300 FCFA'})],{client}],
[33,[line('B',1,{price:4999})],{client}],
[34,[line('B',1,{price:5000}),stamp],{client}],
[40,null,{type:'FA',originTest:3}],
[41,null,{type:'FA',originTest:9}],
[42,null,{type:'FA',originTest:26}],
];
async function main(){
 const config=await source.configurationESECeF.findFirst({where:{actif:true}});assert.equal(config?.environnement,'test');assert.match(config.nim,/^ET/);
 const databases=await source.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',name);if(!databases.length)await source.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
 const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;const env={...process.env,DATABASE_URL:u.toString()};db=new PrismaClient({datasources:{db:{url:u.toString()}}});
 const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});assert.equal(migration.status,0,'Migrations isolées');
 await db.configurationESECeF.upsert({where:{id:config.id},create:config,update:{}});for(const param of await source.parametres.findMany())await db.parametres.upsert({where:{cle:param.cle},create:param,update:{}});
 const salt='sfe-v3-isolated';await db.utilisateur.upsert({where:{email:'sfe-v3@pharmacare.test'},create:{nom:'Numerique',prenom:'Niger',email:'sfe-v3@pharmacare.test',motDePasse:'scrypt:'+salt+':'+scryptSync('Local-SFE-v3-20261019',salt,64).toString('hex'),role:'admin'},update:{nom:'Numerique',prenom:'Niger'}});
 const log=fs.openSync(out+'/serveur.log','a');server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3103'],{env,stdio:['ignore','pipe',log]});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Serveur isolé indisponible')),20000);server.stdout.on('data',d=>{fs.writeSync(log,d);if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(Error('Arrêt du serveur isolé'));});});
 const login=await api('/api/auth/login',{email:'sfe-v3@pharmacare.test',motDePasse:'Local-SFE-v3-20261019'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 for(const mode of ['ttc','ht'])for(const [test,items,extra={}] of plans){
  if(process.argv.includes('--sample')&&(test!==50||mode!=='ttc'))continue;
  if(!process.argv.includes('--sample')&&test===50)continue;
  if(extra.type==='FA'&&!process.argv.includes('--credits'))continue;
  const key=String(test).padStart(2,'0')+'-'+mode;let entry=rows.find(r=>r.key===key);const reservedRn=entry?.request?.rn;if(entry&&process.argv.includes('--retry-refused')&&entry.type==='FA'&&entry.status==='refusee'&&!entry.uid&&entry.http===400&&String(entry.error).includes('introuvable')){rows=rows.filter(r=>r!==entry);entry=null;}if(entry){if(process.argv.includes('--refresh-documents')&&entry.status==='certifiee'){const doc=await api('/api/invoice/document?demandeUid='+encodeURIComponent(entry.uid));assert.equal(doc.status,200);fs.writeFileSync(out+'/'+key+'.json',JSON.stringify(doc.data,null,2));}console.log(key+' : conservé ('+entry.status+')');continue;}
  await db.configurationESECeF.update({where:{id:config.id},data:{modePrix:mode.toUpperCase()}});
  const rn=reservedRn||await source.$transaction(tx=>numberingModule.exports.nextInvoiceNumber(tx,config.nim));
  assert.match(rn,/^FC\/ET01000293\/1-\d+\/2026$/);
  const {originTest,...invoiceExtra}=extra;let request={type:'FV',rn,items,...invoiceExtra};
  if(extra.type==='FA'){const origin=rows.find(r=>r.test===extra.originTest&&r.mode===mode&&r.status==='certifiee');assert.ok(origin,'Vente originale nécessaire');const snap=await db.demandeCertification.findUniqueOrThrow({where:{uid:origin.uid}});const sec=snap.securite;request={...snap.requete,type:'FA',rn:request.rn,reference:sec.nim+'-'+sec.counters.split(' ')[0].split('/')[1]};delete request._issuer;assert.deepEqual(request.items,snap.requete.items);assert.deepEqual(request.client,snap.requete.client);}
  entry={key,test,mode,type:request.type,request,status:'preparation',startedAt:new Date().toISOString()};rows.push(entry);persist();
  const calculated=await api('/api/invoice/calculate',{invoiceData:request});entry.http=calculated.status;
  if(!calculated.data.success){entry.status='refusee';entry.error=calculated.data.error||calculated.data;persist();console.log(key+' : REFUS '+JSON.stringify(entry.error));continue;}
  entry.uid=calculated.data.uid;entry.totals=calculated.data.totals;entry.status='soumise';persist();
  assert.ok(Number.isSafeInteger(entry.totals.total));
  const finalized=await api('/api/invoice/finalize',{uid:entry.uid,action:'confirm'});if(!finalized.data.success){entry.status='a_rapprocher';entry.error=finalized.data;persist();throw Error(key+' finalisation incertaine, arrêt sans nouvelle soumission');}
  entry.security=finalized.data.securityElements;assert.ok(entry.security.codeSECeFDGI&&entry.security.qrCode);entry.status='certifiee';entry.finishedAt=new Date().toISOString();persist();
  const doc=await api('/api/invoice/document?demandeUid='+encodeURIComponent(entry.uid));assert.equal(doc.status,200,JSON.stringify(doc.data));fs.writeFileSync(out+'/'+key+'.json',JSON.stringify(doc.data,null,2));
  console.log(key+' : CERTIFIÉE '+entry.totals.total+' FCFA');
 }
 const demands=await db.demandeCertification.findMany();fs.writeFileSync(out+'/demandes-certifiees.json',JSON.stringify(demands,null,2));
 console.log('Résultats : '+rows.filter(r=>r.status==='certifiee').length+' certifiées / '+rows.length+' essais. Aucun stock métier modifié.');
}
main().catch(e=>{console.error('Suite interrompue : '+e.message);process.exitCode=1;}).finally(async()=>{persist();if(server)server.kill('SIGTERM');if(db)await db.$disconnect();await source.$disconnect();});
