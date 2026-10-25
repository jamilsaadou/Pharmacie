import{NextRequest,NextResponse}from'next/server';import{prisma}from'@/lib/prisma';import{requireUser}from'@/lib/session';import{apiError}from'@/lib/api-error';import{stockLock,stockEvent,syncStock,addStockLot,transferLot,summarizeLots,actorName,expiryFloor}from'@/lib/stock-ledger';
export async function GET(request:NextRequest){try{
 await requireUser(false,'stock');const p=request.nextUrl.searchParams,view=p.get('view')||'lots',medicamentId=p.get('medicamentId')||undefined,page=Math.max(1,Number(p.get('page'))||1),take=20;let where:any=medicamentId?{medicamentId}:{};
 const [medicaments,rayons]=await Promise.all([prisma.medicament.findMany({select:{id:true,nom:true,prix:true},orderBy:{nom:'asc'}}),prisma.rayon.findMany()]);
 if(view==='inventaires')return NextResponse.json({items:await prisma.inventaire.findMany({include:{lignes:{include:{lot:{include:{medicament:{select:{nom:true}}}}}}},orderBy:{dateCreation:'desc'},take:30}),medicaments,rayons});
 if(view==='conditionnements')return NextResponse.json({items:await prisma.conditionnement.findMany({where,include:{medicament:{select:{nom:true}}},orderBy:{nom:'asc'}}),medicaments,rayons});
 if(view==='journal'){where=medicamentId?{lot:{medicamentId}}:{};const[count,items]=await Promise.all([prisma.mouvementStock.count({where}),prisma.mouvementStock.findMany({where,include:{lot:{include:{medicament:{select:{nom:true}}}}},orderBy:[{date:'desc'},{id:'desc'}],skip:(page-1)*take,take})]);return NextResponse.json({items,count,page,pages:Math.max(1,Math.ceil(count/take)),medicaments,rayons});}
 const status=p.get('status');if(status==='perime')where.dateExpiration={lt:expiryFloor()};else if(status&&status!=='all'){where.statut=status;if(status==='disponible')where.dateExpiration={gte:expiryFloor()};}
 const[count,items,summaryGroups]=await Promise.all([prisma.lotStock.count({where}),prisma.lotStock.findMany({where,include:{medicament:{select:{nom:true}}},orderBy:[{dateExpiration:'asc'},{id:'asc'}],skip:(page-1)*take,take}),prisma.lotStock.groupBy({by:['statut','dateExpiration'],where:medicamentId?{medicamentId}:{},_sum:{quantite:true,quantiteReservee:true}})]);
 return NextResponse.json({items,count,page,pages:Math.max(1,Math.ceil(count/take)),summary:summarizeLots(summaryGroups.map(g=>({...g,quantite:g._sum.quantite||0,quantiteReservee:g._sum.quantiteReservee||0}))),medicaments,rayons},{headers:{'Cache-Control':'no-store'}});
}catch(error){return apiError(error);}}
export async function POST(request:NextRequest){try{
 const user=await requireUser(false,'stock');const b=await request.json();const result=await prisma.$transaction(async tx=>{
 await stockLock(tx);const reason=String(b.motif||'').trim();
 if(b.action==='entree'){
  if(!reason||!b.requestKey)throw Error('Motif et clé de l’entrée requis.');const key='entree:'+user.id+':'+b.requestKey;const existing=await tx.mouvementStock.findFirst({where:{documentId:key,type:'entree'}});if(existing)return tx.lotStock.findUnique({where:{id:existing.lotId}});
  await tx.medicament.findUniqueOrThrow({where:{id:b.medicamentId}});if(!b.numero?.trim())throw Error('Numéro fabricant du lot requis.');const expiry=new Date(b.dateExpiration);return addStockLot(tx,{...b,statut:expiry<expiryFloor()?'quarantaine':'disponible'},user,reason,key);
 }
 if(['qualifier','bloquer','transferer'].includes(b.action)){
  const lot=await tx.lotStock.findUniqueOrThrow({where:{id:b.id}});if(!reason)throw Error('Indiquez le motif de l’opération.');
  if(b.action==='transferer')return transferLot(tx,lot.id,b.quantite,b.rayonId||null,user,reason);
  if(b.action==='bloquer'){await tx.lotStock.update({where:{id:lot.id},data:{statut:'bloque'}});}
  else{const date=new Date(b.dateExpiration);if(!b.numero?.trim()||!Number.isFinite(date.getTime()))throw Error('Numéro de lot et péremption requis.');await tx.lotStock.update({where:{id:lot.id},data:{numero:b.numero.trim(),dateExpiration:date,statut:date<expiryFloor()?'quarantaine':'disponible'}});}
  await stockEvent(tx,lot,b.action,0,lot.quantite,user,reason);await syncStock(tx,lot.medicamentId);return{success:true};
 }
 if(b.action==='inventaire_creer'){
  const lots=await tx.lotStock.findMany({where:{OR:[{quantite:{gt:0}},{quantiteReservee:{gt:0}}]}});if(!lots.length)throw Error('Aucun lot à inventorier.');return tx.inventaire.create({data:{reference:'INV-'+Date.now(),utilisateur:actorName(user),utilisateurId:user.id,lignes:{create:lots.map(l=>({lotId:l.id,theorique:l.quantite,reservee:l.quantiteReservee}))}}});
 }
 if(['inventaire_compter','inventaire_valider','inventaire_rebaser'].includes(b.action)){
  const inventory=await tx.inventaire.findUniqueOrThrow({where:{id:b.id},include:{lignes:{include:{lot:true}}}});if(inventory.statut==='valide'){if(b.action==='inventaire_valider')return inventory;throw Error('Cet inventaire est déjà validé.');}
  if(b.action==='inventaire_rebaser'){for(const line of inventory.lignes)await tx.ligneInventaire.update({where:{id:line.id},data:{theorique:line.lot.quantite,reservee:line.lot.quantiteReservee,comptee:null,motif:null}});const added=await tx.lotStock.findMany({where:{id:{notIn:inventory.lignes.map(l=>l.lotId)},OR:[{quantite:{gt:0}},{quantiteReservee:{gt:0}}]}});for(const lot of added)await tx.ligneInventaire.create({data:{inventaireId:inventory.id,lotId:lot.id,theorique:lot.quantite,reservee:lot.quantiteReservee}});return{success:true};}
  if(b.action==='inventaire_compter'){
   if(!Array.isArray(b.lignes))throw Error('Comptages requis.');for(const line of b.lignes){const original=inventory.lignes.find(l=>l.id===line.id);if(!original||!Number.isInteger(line.comptee)||line.comptee<0||line.comptee<original.reservee)throw Error('Le comptage physique doit couvrir les unités réservées et rester positif.');const available=line.comptee-original.reservee;await tx.ligneInventaire.update({where:{id:original.id},data:{comptee:available,motif:String(line.motif||'')}});}return{success:true};
  }
  if(await tx.lotStock.count({where:{id:{notIn:inventory.lignes.map(l=>l.lotId)},OR:[{quantite:{gt:0}},{quantiteReservee:{gt:0}}]}}))throw Error('De nouveaux lots ont été reçus. Rebasez et recomptez l’inventaire.');
  for(const line of inventory.lignes){if(line.comptee===null)throw Error('Comptez chaque lot avant validation.');if(line.lot.quantite!==line.theorique||line.lot.quantiteReservee!==line.reservee)throw Error('Le stock a évolué pendant le comptage. Rebasez puis recomptez l’inventaire.');const delta=line.comptee-line.theorique;if(delta&&!line.motif?.trim())throw Error('Chaque écart nécessite un motif.');if(delta){await tx.lotStock.update({where:{id:line.lotId},data:{quantite:line.comptee}});await stockEvent(tx,line.lot,'inventaire',delta,line.comptee,user,line.motif!,inventory.id);await syncStock(tx,line.lot.medicamentId);}}
  return tx.inventaire.update({where:{id:inventory.id},data:{statut:'valide',dateValidation:new Date()}});
 }
 if(b.action==='conditionnement'){
  if(!b.nom?.trim()||!Number.isInteger(b.facteur)||b.facteur<=0||!Number.isSafeInteger(b.prixVente)||b.prixVente<0)throw Error('Nom, conversion entière positive et prix en FCFA requis.');
  if(b.codeBarres){const med=await tx.medicament.findFirst({where:{codeBarres:b.codeBarres}});if(med)throw Error('Ce code-barres est déjà utilisé par un article.');}
  const data={medicamentId:b.medicamentId,nom:b.nom.trim(),facteur:b.facteur,prixVente:b.prixVente,codeBarres:b.codeBarres||null,actif:b.actif!==false};
  const saved=b.id?await tx.conditionnement.update({where:{id:b.id},data}):await tx.conditionnement.create({data});await tx.auditLog.create({data:{module:'stock',action:'update',userId:user.id,targetId:saved.id,message:'Conditionnement : '+data.nom,details:JSON.stringify(data)}});return saved;
 }
 throw Error('Opération de stock inconnue.');
 },{maxWait:10000,timeout:30000});return NextResponse.json(result);
}catch(error){return apiError(error);}}
