// Archive the already certified DGI test invoices. No DGI calls, stock or cash movement.
const fs=require('node:fs'),assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
const out='output/sfe-selection-20261023';
async function main(){
 const rows=JSON.parse(fs.readFileSync(out+'/resultats.json'));
 const demands=JSON.parse(fs.readFileSync(out+'/demandes-certifiees.json'));
 const checks=JSON.parse(fs.readFileSync(out+'/controle-concordance.json'));
 assert.equal(rows.length,20);assert.equal(checks.filter(r=>r.matched).length,20);
 const config=await db.configurationESECeF.findFirst({where:{actif:true}});
 assert.equal(config.environnement,'test');assert.equal(config.nim,'ET01000367-1');assert.equal(config.isf,'45977');
 const before=await db.medicament.findMany({select:{id:true,quantiteStock:true}});
 let imported=0;
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
  for(const row of rows){
   assert.equal(row.status,'certifiee');const demand=demands.find(d=>d.uid===row.uid);assert.ok(demand);
   const snapshot={...demand.requete,_totals:demand.totaux,_security:demand.securite};
   assert.equal(snapshot._security.nim,config.nim);assert.equal(snapshot.isf,config.isf);
   const exists=await tx.factureESECeF.findFirst({where:{uid:row.uid}});if(exists)continue;
   const id='sfe-selection-20261023-'+row.key;
   const clientId=snapshot.client?id+'-client':null;
   if(clientId)await tx.client.create({data:{id:clientId,nom:snapshot.client.name,prenom:'',nif:snapshot.client.nif||null}});
   const sign=snapshot.type==='FA'?-1:1;
   const date=new Date(row.finishedAt);const totals=snapshot._totals;
   const sale=await tx.vente.create({data:{id:id+'-vente',numeroFacture:snapshot.rn,date,clientId,
    sousTotal:sign*(totals.total-totals.vtotal-(totals.isb||0)),tva:sign*totals.vtotal,remise:0,total:sign*totals.total,
    methodePaiement:'especes',statut:'terminee',vendeur:snapshot.operator.name,typeFacture:snapshot.type,factureReference:snapshot.reference||null}});
   // Decimal quantities remain exact in the immutable fiscal snapshot; never round them into integer stock rows.
   if(snapshot.items.every(i=>Number.isInteger(i.quantity)))await tx.itemVente.createMany({data:snapshot.items.map(i=>({venteId:sale.id,libelle:i.name,code:i.code,quantite:i.quantity,prixUnitaire:i.price,remise:0,sousTotal:i.price*i.quantity,groupeTaxation:i.taxGroup}))});
   await tx.factureESECeF.create({data:{id,venteId:sale.id,numeroFacture:snapshot.rn,statut:'certifiee',requestData:JSON.stringify(snapshot),uid:row.uid,codeSECeFDGI:snapshot._security.codeSECeFDGI,qrCode:snapshot._security.qrCode,dateTimeCertification:date,counters:snapshot._security.counters,configurationId:config.id,tentatives:1}});
   imported++;
  }
 },{timeout:30000});
 const after=await db.medicament.findMany({select:{id:true,quantiteStock:true}});assert.deepEqual(after.sort((a,b)=>a.id.localeCompare(b.id)),before.sort((a,b)=>a.id.localeCompare(b.id)));
 const count=await db.factureESECeF.count({where:{uid:{in:rows.map(r=>r.uid)},statut:'certifiee'}});assert.equal(count,20);
 fs.writeFileSync(out+'/import-plateforme.json',JSON.stringify({imported,present:count,stocksUnchanged:true},null,2));
 console.log(`${imported} factures ajoutées ; ${count} présentes et téléchargeables. Stocks inchangés.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
