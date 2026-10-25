// Homologation SFE v3 — factures de vente strictement A/B, articles propres (sans mention « (TEST) »).
// Cas officiels couverts : #1, #3, #9, #10, #25 (adapté strictement A/B) et #26, en modes TTC et HT.
// Émission réelle vers le bac à sable DGI (environnement test). Aucune donnée métier (stock/ventes) modifiée :
// l'émission passe par une base PostgreSQL isolée et un serveur Next dédié. La numérotation reste séquentielle.
const fs=require('node:fs'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{scryptSync}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const source=new PrismaClient();
const name='pharmacare_sfe_v3_20261019',out='output/homologation-ab-propre-20261022';fs.mkdirSync(out,{recursive:true});const file=out+'/resultats.json';
let rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[],db,server,cookie='';
const ts=require('typescript'), numberingModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/invoice-number.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,numberingModule,numberingModule.exports);
const persist=()=>fs.writeFileSync(file,JSON.stringify(rows,null,2));
async function api(path,body){const r=await fetch('http://127.0.0.1:3103'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return{status:r.status,data:await r.json(),headers:r.headers};}

// Clients de test (noms propres, sans mention « (TEST) »).
const clientComplet={nif:'1111',name:'Pharmacie du Fleuve'};   // NIF + nom (cas #10)
const clientNom={name:'Clinique de la Concorde'};               // nom seul (cas #9)

// Catalogue propre : A = produit exonéré (TVA 0 %), B = produit taxable (TVA 19 %).
const A=(q,extra={})=>({code:'MED-PARA-500',name:'Paracétamol 500 mg comprimé',price:800,quantity:q,taxGroup:'A',...extra});
const B=(q,extra={})=>({code:'PARA-GEL-250',name:'Gel hydroalcoolique 250 ml',price:1190,quantity:q,taxGroup:'B',...extra});
const timbre={code:'TIMBRE',name:'Timbre fiscal',price:200,quantity:1,taxGroup:'L'};

// [n° de test officiel, articles, extras]. Aucun client sur les cas #1/#3/#25/#26 (colonne client vide dans le document DGI).
const plans=[
 [1 ,[A(1)]                                                                                                            ,{}],
 [3 ,[B(2),A(3)]                                                                                                       ,{}],
 [9 ,[B(2),A(3)]                                                                                                       ,{client:clientNom,isb:'B'}],     // précompte ISB 5 %, nom du client seul
 [10,[B(2),A(3)]                                                                                                       ,{client:clientComplet,isb:'A'}],// précompte ISB 2 %, NIF + nom
 [25,[B(2,{price:1071,originalPrice:1190,priceModification:'Remise 10%'}),A(3,{price:700,originalPrice:800,priceModification:'Remise totale de 300 FCFA'})],{}],
 [26,[A(1),B(1),timbre]                                                                                                ,{}],
];

async function main(){
 const config=await source.configurationESECeF.findFirst({where:{actif:true}});assert.equal(config?.environnement,'test','La configuration active doit être en environnement test.');assert.match(config.nim,/^ET/,'Le NIM de test doit commencer par ET.');
 const databases=await source.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',name);if(!databases.length)await source.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
 const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;const env={...process.env,DATABASE_URL:u.toString()};db=new PrismaClient({datasources:{db:{url:u.toString()}}});
 const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});assert.equal(migration.status,0,'Migrations isolées');
 await db.configurationESECeF.upsert({where:{id:config.id},create:config,update:{}});for(const param of await source.parametres.findMany())await db.parametres.upsert({where:{cle:param.cle},create:param,update:{}});
 const salt='sfe-v3-isolated';await db.utilisateur.upsert({where:{email:'sfe-v3@pharmacare.test'},create:{nom:'Numerique',prenom:'Niger',email:'sfe-v3@pharmacare.test',motDePasse:'scrypt:'+salt+':'+scryptSync('Local-SFE-v3-20261019',salt,64).toString('hex'),role:'admin'},update:{nom:'Numerique',prenom:'Niger'}});
 const log=fs.openSync(out+'/serveur.log','a');server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3103'],{env,stdio:['ignore','pipe',log]});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Serveur isolé indisponible')),20000);server.stdout.on('data',d=>{fs.writeSync(log,d);if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(Error('Arrêt du serveur isolé'));});});
 const login=await api('/api/auth/login',{email:'sfe-v3@pharmacare.test',motDePasse:'Local-SFE-v3-20261019'});assert.equal(login.status,200,'Authentification isolée');cookie=login.headers.get('set-cookie').split(';')[0];
 for(const mode of ['ttc','ht'])for(const [test,items,extra] of plans){
  const key=String(test).padStart(2,'0')+'-'+mode;let entry=rows.find(r=>r.key===key);
  if(entry){console.log(key+' : conservé ('+entry.status+')');continue;}
  await db.configurationESECeF.update({where:{id:config.id},data:{modePrix:mode.toUpperCase()}});
  const rn=await source.$transaction(tx=>numberingModule.exports.nextInvoiceNumber(tx,config.nim));
  assert.match(rn,/^FC\/ET01000293\/1-\d+\/2026$/,'Format du numéro de facture');
  const request={type:'FV',rn,items,...extra};
  entry={key,test,mode,type:request.type,request,status:'preparation',startedAt:new Date().toISOString()};rows.push(entry);persist();
  const calculated=await api('/api/invoice/calculate',{invoiceData:request});entry.http=calculated.status;
  if(!calculated.data.success){entry.status='refusee';entry.error=calculated.data.error||calculated.data;persist();console.log(key+' : REFUS '+JSON.stringify(entry.error));continue;}
  entry.uid=calculated.data.uid;entry.totals=calculated.data.totals;entry.status='soumise';persist();
  assert.ok(Number.isSafeInteger(entry.totals.total),'Total entier attendu');
  const finalized=await api('/api/invoice/finalize',{uid:entry.uid,action:'confirm'});if(!finalized.data.success){entry.status='a_rapprocher';entry.error=finalized.data;persist();throw Error(key+' finalisation incertaine, arrêt sans nouvelle soumission');}
  entry.security=finalized.data.securityElements;assert.ok(entry.security.codeSECeFDGI&&entry.security.qrCode,'Éléments de sécurité attendus');entry.status='certifiee';entry.finishedAt=new Date().toISOString();persist();
  const doc=await api('/api/invoice/document?demandeUid='+encodeURIComponent(entry.uid));assert.equal(doc.status,200,JSON.stringify(doc.data));fs.writeFileSync(out+'/'+key+'.json',JSON.stringify(doc.data,null,2));
  console.log(key+' : CERTIFIÉE '+entry.totals.total+' FCFA — '+entry.security.codeSECeFDGI);
 }
 const demands=await db.demandeCertification.findMany();fs.writeFileSync(out+'/demandes-certifiees.json',JSON.stringify(demands,null,2));
 console.log('Résultats : '+rows.filter(r=>r.status==='certifiee').length+' certifiées / '+rows.length+' essais. Aucun stock métier modifié.');
}
main().catch(e=>{console.error('Suite interrompue : '+e.message);process.exitCode=1;}).finally(async()=>{persist();if(server)server.kill('SIGTERM');if(db)await db.$disconnect();await source.$disconnect();});
