// Crée UNE facture de vente certifiée PROPRE dans la base métier (gestion_pharma), consultable/imprimable dans l'app.
// Lignes « prestation » (sans medicamentId) => AUCUN débit de stock, AUCUNE modification du catalogue.
// Démarre un serveur Next dédié (code actuel) sur la base métier, poste via /api/ventes (certification automatique).
const fs=require('node:fs'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{scryptSync}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
const PORT=3109,BASE='http://127.0.0.1:'+PORT,out='output/homologation-verif-unitaire';fs.mkdirSync(out,{recursive:true});
let server,cookie='';
async function api(path,body,method){const r=await fetch(BASE+path,{method:method||(body?'POST':'GET'),headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});let data;try{data=await r.json();}catch{data=null;}return{status:r.status,data,headers:r.headers};}
async function main(){
 const config=await db.configurationESECeF.findFirst({where:{actif:true}});assert.equal(config?.environnement,'test','Doit être en environnement test.');
 const salt='sfe-apercu',email='sfe-apercu@pharmacare.test',pwd='Apercu-SFE-20261022';
 const hash='scrypt:'+salt+':'+scryptSync(pwd,salt,64).toString('hex');
 await db.utilisateur.upsert({where:{email},create:{nom:'Essai',prenom:'Homologation',email,motDePasse:hash,role:'admin'},update:{motDePasse:hash,role:'admin'}});
 await db.configurationESECeF.update({where:{id:config.id},data:{modePrix:'TTC'}}); // prix TTC pour cet aperçu
 const log=fs.openSync(out+'/serveur-app.log','w');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(PORT)],{env:process.env,stdio:['ignore','pipe',log]});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Serveur indisponible')),25000);server.stdout.on('data',d=>{fs.writeSync(log,d);if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(Error('Arrêt du serveur'));});});
 const login=await api('/api/auth/login',{email,motDePasse:pwd});assert.equal(login.status,200,'Connexion: '+JSON.stringify(login.data));cookie=login.headers.get('set-cookie').split(';')[0];
 const items=[
  {nom:'Gel hydroalcoolique 250 ml',libelle:'Gel hydroalcoolique 250 ml',prixUnitaire:1190,quantite:2,groupeTaxation:'B',code:'PARA-GEL-250'},
  {nom:'Paracétamol 500 mg comprimé',libelle:'Paracétamol 500 mg comprimé',prixUnitaire:800,quantite:3,groupeTaxation:'A',code:'MED-PARA-500'},
 ];
 // Mode TTC : sousTotal et total = somme des montants TTC (4780) ; TVA = part B (2380 TTC -> 2000 HT -> 380).
 const vente=await api('/api/ventes',{items,methodePaiement:'especes',typeFacture:'FV',sousTotal:4780,tva:380,total:4780});
 console.log('POST /api/ventes ->',vente.status);
 if(vente.status!==200&&vente.status!==201){console.error('Échec: '+JSON.stringify(vente.data));console.error('--- logs serveur (fin) ---');try{console.error(fs.readFileSync(out+'/serveur-app.log','utf8').split('\n').slice(-25).join('\n'));}catch{}process.exitCode=1;return;}
 const v=vente.data;const cert=vente.data.certification;const numero=v.numeroFacture;
 console.log('Vente créée:',numero,'| certification:',cert?(cert.success?'SUCCÈS '+(cert.securityElements?.codeSECeFDGI||''):'ÉCHEC '+JSON.stringify(cert.error||cert.message)):'(non renvoyée)');
 const list=await api('/api/invoice/certified?search='+encodeURIComponent(numero));
 const found=(list.data.factures||[]).find(f=>f.numeroFacture===numero);
 console.log('Dans « factures certifiées » :',found?('OUI — code '+found.codeSECeFDGI):'NON');
 const doc=await api('/api/invoice/document?venteId='+encodeURIComponent(v.id));
 if(doc.status===200){const d=doc.data;fs.writeFileSync(out+'/apercu-app.json',JSON.stringify(d,null,2));console.log('Document imprimable: OUI | total',d.totalTTC,'| articles:',d.items.map(i=>i.nom+' ['+i.groupeTaxation+']x'+i.quantite).join(' ; '));console.log('Code SECeF/DGI:',d.securityElements.codeSECeFDGI);}
 else console.log('Document indisponible:',JSON.stringify(doc.data));
 console.log('Utilisateur de test (propriétaire de la vente):',email);
}
main().catch(e=>{console.error('Interrompu: '+e.message);process.exitCode=1;}).finally(()=>{if(server)server.kill('SIGTERM');db.$disconnect();});
