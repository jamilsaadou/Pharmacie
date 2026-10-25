// Import already-certified sandbox evidence; never issues fiscal requests or moves real stock.
const fs=require('node:fs');require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
async function main(){const rows=JSON.parse(fs.readFileSync('output/validation-dgi-test/historique-fiscal.json'));const results=JSON.parse(fs.readFileSync('output/validation-dgi-test/resultats.json'));if(rows.length!==10||!results.every(c=>c.success))throw Error('Dossier de tests incomplet.');const config=await db.configurationESECeF.findFirst({where:{actif:true}});if(config?.environnement!=='test')throw Error('Import réservé à la configuration de test.');for(const f of rows){const s=JSON.parse(f.requestData);if(f.statut!=='certifiee'||s._issuer?.environnement!=='test'||s._security?.nim!==config.nim)throw Error('Document non admissible au dossier de test.');}
 const before=await db.medicament.findMany({select:{id:true,quantiteStock:true}});let imported=0;
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
  await tx.medicament.upsert({where:{id:'fiscal-test-spec-reference'},create:{id:'fiscal-test-spec-reference',nom:'ARTICLE SPEC — ESSAI UNIQUEMENT',description:'Référence fictive utilisée pour les essais DGI. Ne représente pas un médicament réel.',prix:1000,quantiteStock:0,seuilAlerte:0,dateExpiration:new Date('2099-01-01'),categorie:'Essais DGI fictifs',fournisseur:'Contrôle fiscal',forme:'unité',groupeTaxation:'B'},update:{}});
  for(const f of rows){const existing=await tx.factureESECeF.findFirst({where:{OR:[{id:f.id},{uid:f.uid}]}});if(existing)continue;
   const {items,client,...vente}=f.vente;const snapshot=JSON.parse(f.requestData);
   if(client){const identity=snapshot.client;await tx.client.upsert({where:{id:client.id},create:{id:client.id,nom:(identity?.name||client.nom).trim(),prenom:'',nif:identity?.nif||null,adresse:identity?.address||null,telephone:identity?.contact||null},update:{}});}
   await tx.vente.create({data:vente});await tx.itemVente.createMany({data:items.map(i=>({...i,medicamentId:i.medicamentId?'fiscal-test-spec-reference':null}))});
   const {vente:ignored,...invoice}=f;invoice.configurationId=config.id;await tx.factureESECeF.create({data:invoice});imported++;
  }
 });
 const after=await db.medicament.findMany({select:{id:true,quantiteStock:true}});for(const item of before)if(after.find(i=>i.id===item.id)?.quantiteStock!==item.quantiteStock)throw Error('Contrôle de stock non conforme.');console.log(imported+' documents de test rendus visibles. Stocks habituels inchangés. Aucun appel DGI.');}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
