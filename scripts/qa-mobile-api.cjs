// Isolated PostgreSQL database. No external fiscal call: catalogueFiscal has no taxes.
const {spawn,spawnSync}=require('node:child_process');
const {randomBytes,scryptSync}=require('node:crypto');
const assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient}=require('@prisma/client');
const admin=new PrismaClient(),database='pharma_mobile_qa_'+randomBytes(6).toString('hex');
const url=new URL(process.env.DATABASE_URL);url.pathname='/'+database;
const password='Mobile-QA-Only-2026',salt='mobile-fixture';
const port=process.env.MOBILE_QA_PORT||'3103',base='http://127.0.0.1:'+port;
let db,server,created=false,passed=0;
const logs=[];
async function api(path,method='GET',body,token){const r=await fetch(base+'/api/mobile/v1/'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
async function ok(label,fn){await fn();passed++;console.log('OK '+label);}
async function main(){
 await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);created=true;
 const env={...process.env,DATABASE_URL:url.toString()};
 const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});
 assert.equal(migration.status,0,migration.stderr);
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});
 const hash='scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
 for(const id of ['agent-a','agent-b'])await db.utilisateur.create({data:{id,nom:id,prenom:'QA',email:id+'@mobile.test',role:'vendeur',motDePasse:hash}});
 await db.configurationESECeF.create({data:{nif:'9999',nim:'QA-MOBILE',isf:'QA',token:'NOT-A-REAL-TOKEN',environnement:'test',actif:true,nomEtablissement:'QA fictive'}});
 await db.medicament.create({data:{id:'med-1',nom:'Produit mobile QA',description:'Fixture isolée',prix:500,quantiteStock:20,seuilAlerte:5,dateExpiration:new Date('2035-01-01'),categorie:'QA',fournisseur:'QA',forme:'comprimé',groupeTaxation:'B'}});
 await db.lotStock.create({data:{medicamentId:'med-1',quantite:20,statut:'disponible',dateExpiration:new Date('2035-01-01')}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>logs.push(String(d)));server.stderr.on('data',d=>logs.push(String(d)));
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Serveur arrêté');try{const r=await fetch(base+'/api/mobile/v1/me');if(r.status===401)break;}catch{}if(i===99)throw Error('Serveur indisponible');await new Promise(r=>setTimeout(r,100));}
 let a,b,cash,sale;
 await ok('login, opaque bearer and no password exposure',async()=>{
  const login=await api('auth/login','POST',{email:'agent-a@mobile.test',motDePasse:password,appareil:'QA Android'});assert.equal(login.status,200);a=login.data.accessToken;assert.match(a,/^pm_/);assert.equal(login.data.utilisateur.motDePasse,undefined);
  b=(await api('auth/login','POST',{email:'agent-b@mobile.test',motDePasse:password,appareil:'QA iOS'})).data.accessToken;
  assert.equal((await api('me')).status,401);assert.equal((await api('me','GET',null,a)).data.utilisateur.id,'agent-a');
 });
 await ok('stock accessible to sales agent without stock write permission',async()=>{const r=await api('stock?q=mobile','GET',null,a);assert.equal(r.status,200);assert.equal(r.data.data[0].stock.disponible,20);});
 await ok('personal cash opening and foreign session protection',async()=>{
  const r=await api('caisse','POST',{action:'ouvrir',montant:1000},a);assert.equal(r.status,200);cash=r.data.id;
  assert.equal((await api('caisse','POST',{action:'cloturer',id:cash,montant:1000},b)).status,404);
  assert.equal((await api('caisse','GET',null,b)).data.current,null);
 });
 await ok('cash movement replay and conflict do not double debit',async()=>{
  const movement={action:'mouvement',id:cash,cle:'qa-mobile-movement-0001',type:'sortie',montant:100,motif:'Fixture QA'};
  const r=await api('caisse','POST',movement,a);assert.equal(r.status,200);
  assert.equal((await api('caisse','POST',movement,a)).data.id,r.data.id);
  assert.equal((await api('caisse','POST',{...movement,montant:200},a)).status,409);
  assert.equal((await api('caisse','GET',null,a)).data.current.summary.expected,900);
 });
 const basket={requestKey:'qa-mobile-sale-000001',items:[{medicamentId:'med-1',quantite:2}],methodePaiement:'especes'};
 await ok('server price, ownership, pending fiscal state and stock reservation',async()=>{
  const r=await api('ventes','POST',basket,a);assert.equal(r.status,202,JSON.stringify(r.data));sale=r.data.vente.id;
  assert.equal(r.data.vente.operateurId,'agent-a');assert.equal(r.data.vente.caisseId,cash);assert.equal(r.data.vente.items[0].prixUnitaire,500);
  assert.equal((await api('stock','GET',null,a)).data.data[0].stock.disponible,18);
  assert.equal((await api('ventes/'+sale,'GET',null,b)).status,404);
  assert.equal((await api('ventes/'+sale+'/document','GET',null,b)).status,404);
  assert.equal((await api('ventes/'+sale+'/certification','POST',null,b)).status,404);
  assert.equal((await api('caisse','POST',{action:'cloturer',id:cash,montant:900},a)).status,400);
 });
 await ok('sale replay survives price changes, payload conflict and concurrent writes',async()=>{
  await db.medicament.update({where:{id:'med-1'},data:{prix:600}});
  assert.equal((await api('ventes','POST',basket,a)).data.vente.id,sale);
  assert.equal((await api('ventes','POST',{...basket,methodePaiement:'carte'},a)).status,409);
  const body={...basket,requestKey:'qa-mobile-sale-parallel-0001',items:[{medicamentId:'med-1',quantite:1}]};
  const results=await Promise.all([api('ventes','POST',body,a),api('ventes','POST',body,a)]);
  for(const r of results)assert.ok([200,202].includes(r.status),JSON.stringify(r));
  assert.equal(results[0].data.vente.id,results[1].data.vente.id);
  assert.equal(await db.vente.count(),2);assert.equal((await api('stock','GET',null,a)).data.data[0].stock.disponible,17);
 });
 await ok('closed cash and insufficient stock reject sale atomically',async()=>{
  const noCash=await api('ventes','POST',{...basket,requestKey:'qa-mobile-no-cash-000001'},b);assert.equal(noCash.status,400);
  const impossible=await api('ventes','POST',{...basket,requestKey:'qa-mobile-no-stock-000001',items:[{medicamentId:'med-1',quantite:999}]},a);assert.equal(impossible.status,400);
  assert.equal(await db.vente.count(),2);
 });
 await ok('uncertain certification cannot be submitted again; pending document blocked',async()=>{
  await db.factureESECeF.update({where:{venteId:sale},data:{uid:'fixture-uid',statut:'a_rapprocher'}});
  assert.equal((await api('ventes/'+sale+'/certification','POST',null,a)).status,409);
  assert.equal((await api('ventes/'+sale+'/document','GET',null,a)).status,409);
 });
 await ok('history and personal activity exclude another agent',async()=>{
  assert.equal((await api('ventes','GET',null,b)).data.total,0);
  assert.equal((await api('ventes','GET',null,a)).data.total,2);
  const r=await api('me/situation','GET',null,a);assert.equal(r.status,200);assert.equal(r.data.ventesParStatut[0].nombre,2);assert.equal(r.data.ventesCertifiees.total,0);
 });
 await ok('personal net totals subtract credits and include signed cash receipts',async()=>{
  const config=await db.configurationESECeF.findFirst();
  for(const [id,operator,type,total] of [['qa-fv','agent-a','FV',1000],['qa-fa','agent-a','FA',300],['qa-other','agent-b','FV',8000]]) {
   await db.vente.create({data:{id,numeroFacture:id,operateurId:operator,vendeur:operator,caisseId:operator==='agent-a'?cash:null,sousTotal:total,total,tva:0,remise:0,methodePaiement:'especes',statut:'terminee',typeFacture:type}});
   // Synthetic certified fixture; deliberately never submitted to the tax service.
   await db.factureESECeF.create({data:{venteId:id,numeroFacture:id,configurationId:config.id,statut:'certifiee',requestData:'{}'}});
   await db.encaissement.create({data:{venteId:id,caisseId:operator==='agent-a'?cash:null,mode:'especes',montant:type==='FA'?-total:total}});
  }
  const r=await api('me/situation','GET',null,a);assert.equal(r.status,200);
  assert.deepEqual(r.data.ventesCertifiees,{nombre:2,total:700,montantVentes:1000,montantAvoirs:300});
  assert.equal(r.data.encaissementsParMode[0].montant,700);
  assert.equal((await api('caisse','GET',null,a)).data.current.summary.expected,1600);
 });
 await ok('mobile bearer does not authenticate web routes; logout revokes immediately',async()=>{
  const web=await fetch(base+'/api/medicaments',{headers:{Authorization:'Bearer '+a}});assert.equal(web.status,401);
  assert.equal((await api('auth/logout','POST',null,a)).status,200);assert.equal((await api('me','GET',null,a)).status,401);
  await db.utilisateur.update({where:{id:'agent-b'},data:{motDePasse:'changed'}});assert.equal((await api('me','GET',null,b)).status,401);
 });
 console.log(`${passed} isolated mobile integration scenarios passed. No fiscal submission.`);
}
main().catch(e=>{console.error(e);console.error(logs.join('').slice(-4000));process.exitCode=1;}).finally(async()=>{
 if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
 if(db)await db.$disconnect();
 if(created){await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);}
 await admin.$disconnect();
});
