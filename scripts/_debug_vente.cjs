require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
 const cfg=await db.configurationESECeF.findFirst({where:{actif:true}});
 const user=await db.utilisateur.findFirst({where:{email:'sfe-apercu@pharmacare.test'}});
 try{
  await db.$transaction(async tx=>{
   const num='DEBUG-'+Date.now();
   const v=await tx.vente.create({data:{numeroFacture:num,empreinte:'x',operateurId:user.id,caisseId:null,clientId:null,sousTotal:4780,tva:380,remise:0,remiseType:'PERCENT',remiseValeur:null,remiseMontant:null,total:4780,methodePaiement:'especes',statut:'en_cours',vendeur:'Essai Homologation',typeFacture:'FV',factureReference:null,retourStock:false}});
   await tx.itemVente.create({data:{venteId:v.id,medicamentId:null,libelle:'Gel hydroalcoolique 250 ml',code:'PARA-GEL-250',quantite:2,prixUnitaire:1190,remise:0,remiseType:'PERCENT',sousTotal:2380,groupeTaxation:'B',facteurStock:1}});
   await tx.factureESECeF.create({data:{venteId:v.id,numeroFacture:num,configurationId:cfg.id,statut:'en_attente',requestData:'{}',tentatives:0}});
   throw new Error('__ROLLBACK_OK__');
  });
 }catch(e){
  if(e.message==='__ROLLBACK_OK__')console.log('Toutes les écritures OK (rollback).');
  else console.log('ERREUR:',e.name,'::',e.message.split('\n').slice(-3).join(' | '));
 }
 await db.$disconnect();
})().catch(e=>{console.error('OUTER',e.name,e.message);process.exit(1)});
