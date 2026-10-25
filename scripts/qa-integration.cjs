const {spawn,spawnSync}=require('node:child_process');const {randomBytes,scryptSync}=require('node:crypto');const assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());const {PrismaClient}=require('@prisma/client');
const admin=new PrismaClient();const database='pharmacare_qa_'+randomBytes(5).toString('hex');const url=new URL(process.env.DATABASE_URL);url.pathname='/'+database;const testUrl=url.toString();let server,db;
const password='Local-QA-only-2026';let cookie='';
async function api(path,method='GET',body,authenticated=true){const r=await fetch('http://127.0.0.1:3101'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(authenticated&&cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
async function main(){
 await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);db=new PrismaClient({datasources:{db:{url:testUrl}}});
 const env={...process.env,DATABASE_URL:testUrl};const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});if(migration.status!==0)throw new Error('Migration QA échouée.');
 const salt='qa-fixture-salt';const hash='scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
 const user=await db.utilisateur.create({data:{nom:'Contrôle',prenom:'Qualité',email:'qa@pharmacare.test',motDePasse:hash,role:'admin'}});
 await db.configurationESECeF.create({data:{nif:'999999',nim:'ET-QA-LOCAL',isf:'QA-ONLY',token:'NON-REAL-TEST-TOKEN',environnement:'test',actif:true,nomEtablissement:'Base de contrôle isolée',catalogueFiscal:{taxes:{a:0,b:19},invoiceTypes:[],paymentTypes:[]}}});
 await db.medicament.createMany({data:Array.from({length:200},(_,i)=>({id:'qa-med-'+i,nom:i===0?'Paracétamol 500 mg':`Référence de contrôle ${String(i+1).padStart(3,'0')}`,description:'Donnée de test isolée',prix:1190,quantiteStock:100,seuilAlerte:10,dateExpiration:new Date(Date.now()+315360000000),categorie:i%2?'Parapharmacie':'Médicaments',fournisseur:'QA',forme:'comprimé',groupeTaxation:'B',codeBarres:'200000'+String(i).padStart(7,'0')}))});
 await db.lotStock.createMany({data:Array.from({length:200},(_,i)=>({medicamentId:'qa-med-'+i,numero:'QA-'+i,quantite:100,dateExpiration:new Date(Date.now()+315360000000),statut:'disponible',provenance:'qa'}))});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'],{env,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Serveur QA non disponible')),20000);server.stdout.on('data',d=>{if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(new Error('Serveur QA arrêté'));});});
 assert.equal((await api('/api/medicaments','GET',null,false)).status,401);
 const login=await api('/api/auth/login','POST',{email:'qa@pharmacare.test',motDePasse:password},false);assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await api('/api/medicaments')).data.length,200);
 assert.equal((await api('/api/invoice/pending/db','PUT',{factureId:'protected',action:'retry'})).status,409);
 assert.equal((await api('/api/invoice/pending/db?id=protected','DELETE')).status,409);
 const rayon=await api('/api/collections/rayons','POST',{data:{nom:'QA Rayon',emplacement:'Étagère test',description:'',capaciteMax:200}});assert.equal(rayon.status,201);
 assert.equal((await api('/api/rayons','POST',{medicamentId:'qa-med-0',rayonId:rayon.data.id,quantiteTransferee:10,typeTransfert:'stock_vers_rayon'})).status,201);
 assert.equal((await db.medicament.findUnique({where:{id:'qa-med-0'}})).quantiteStock,100);assert.equal((await db.medicamentRayon.findFirst()).quantiteEnRayon,10);
 assert.equal((await api('/api/rayons','POST',{medicamentId:'qa-med-0',rayonId:rayon.data.id,quantiteTransferee:-1,typeTransfert:'stock_vers_rayon'})).status,400);
 const supplier=await db.fournisseur.create({data:{nom:'Fournisseur QA',contact:'QA',telephone:'TEST',adresse:'TEST'}});
 const order=await db.commandeFournisseur.create({data:{numeroCommande:'QA-COM-001',fournisseurId:supplier.id,statut:'confirmee',total:5000,items:{create:{medicamentId:'qa-med-0',quantiteCommandee:10,prixUnitaire:500,sousTotal:5000}}},include:{items:true}});
 const receipt={cle:'qa-smoke-receipt',lignes:[{itemId:order.items[0].id,quantite:10,numero:'QA-RECEIPT',dateExpiration:'2035-01-01'}]};
 assert.equal((await api('/api/commandes/'+order.id+'/receptions','POST',receipt)).status,201);assert.equal((await api('/api/commandes/'+order.id+'/receptions','POST',receipt)).status,201);assert.equal((await db.medicament.findUnique({where:{id:'qa-med-0'}})).quantiteStock,110);
 const assurance=await api('/api/collections/assurances','POST',{data:{nom:'QA Assurance',tauxCouverture:80}});assert.equal(assurance.status,201);
 assert.equal((await api('/api/collections/assurances','POST',{data:{nom:'Taux invalide',tauxCouverture:150}})).status,400);
 const dossier=await api('/api/collections/dossiers','POST',{data:{assuranceId:assurance.data.id,periodeDebut:new Date(),periodeFin:new Date(),montantTotal:1000,montantCouvert:800,montantPayeClient:200,montantRembourse:0,statut:'en_attente'}});assert.equal(dossier.status,201);
 const paid=await api('/api/collections/dossiers','PUT',{id:dossier.data.id,data:{statut:'rembourse',montantRembourse:800}});assert.equal(paid.status,200);
 assert.equal((await api('/api/collections/assurances?id='+assurance.data.id,'DELETE')).status,400);
 const publicConfig=await api('/api/esecef/config');assert.equal(publicConfig.data.token,undefined);assert.ok(publicConfig.data.tokenMasked);
 console.log('QA API : accès, 200 articles, transfert, réception idempotente, assurances et remboursements : OK.');
 console.log('Serveur QA isolé : http://127.0.0.1:3101 — prêt pour vérification visuelle. Appuyez sur Entrée pour nettoyer.');
 await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve);});
}
main().catch(e=>{console.error('QA échouée : '+e.message);process.exitCode=1;}).finally(async()=>{if(server){server.kill('SIGTERM');await new Promise(r=>setTimeout(r,300));}if(db)await db.$disconnect();await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);await admin.$disconnect();console.log('Base QA et serveur QA supprimés.');process.stdin.pause();});
