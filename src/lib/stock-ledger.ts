import{Prisma}from'@prisma/client';
export type StockTx=Prisma.TransactionClient;
export function expiryFloor(){const day=new Date(Date.now()+3600000).toISOString().slice(0,10);return new Date(day+'T00:00:00+01:00');}
export const actorName=(user:any)=>user?`${user.prenom||''} ${user.nom||user.utilisateur||'Système'}`.trim():'Système';
export const stockLock=(tx:StockTx)=>tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
export async function stockEvent(tx:StockTx,lot:any,type:string,quantity:number,after:number,user:any,reason:string,documentId?:string,destinationLotId?:string){await tx.mouvementStock.create({data:{lotId:lot.id,type,quantite:quantity,avant:lot.quantite,apres:after,utilisateurId:user?.id,utilisateur:actorName(user),motif:reason,documentId,destinationLotId}});}
export async function syncStock(tx:StockTx,medicamentId:string){
 const available=await tx.lotStock.findMany({where:{medicamentId,statut:'disponible',dateExpiration:{gte:expiryFloor()}},orderBy:{dateExpiration:'asc'}});const quantity=available.reduce((s,l)=>s+l.quantite,0);
 await tx.medicament.update({where:{id:medicamentId},data:{quantiteStock:quantity,...(available.find(l=>l.quantite>0)?{dateExpiration:available.find(l=>l.quantite>0)!.dateExpiration}:{})}});
 const placements:Record<string,number>={};for(const l of available)if(l.rayonId)placements[l.rayonId]=(placements[l.rayonId]||0)+l.quantite;
 await tx.medicamentRayon.updateMany({where:{medicamentId},data:{quantiteEnRayon:0}});
 for(const [rayonId,quantite]of Object.entries(placements)){const existing=await tx.medicamentRayon.findFirst({where:{medicamentId,rayonId}});if(existing)await tx.medicamentRayon.update({where:{id:existing.id},data:{quantiteEnRayon:quantite}});else await tx.medicamentRayon.create({data:{medicamentId,rayonId,quantiteEnRayon:quantite,quantiteMinimale:0,statut:'en_vente'}});}
 return quantity;
}
export function summarizeLots(lots:any[],floor=expiryFloor()){
 let disponible=0,reserve=0,bloque=0,perime=0,aQualifier=0,total=0;
 for(const l of lots){reserve+=l.quantiteReservee;total+=l.quantite+l.quantiteReservee;if(new Date(l.dateExpiration)<floor)perime+=l.quantite;else if(l.statut==='disponible')disponible+=l.quantite;else if(l.statut==='a_qualifier')aQualifier+=l.quantite;else bloque+=l.quantite;}
 return{disponible,reserve,bloque,perime,aQualifier,total};
}
export async function addStockLot(tx:StockTx,data:any,user:any,reason:string,documentId?:string){
 if(!Number.isInteger(data.quantite)||data.quantite<0)throw Error('Quantité entière positive requise.');
 const expiry=new Date(data.dateExpiration);if(!Number.isFinite(expiry.getTime()))throw Error('Péremption invalide.');
 const lot=await tx.lotStock.create({data:{medicamentId:data.medicamentId,numero:data.numero?.trim()||null,dateExpiration:expiry,quantite:data.quantite,statut:data.statut==='disponible'&&expiry<expiryFloor()?'quarantaine':data.statut||'a_qualifier',rayonId:data.rayonId||null,fournisseurId:data.fournisseurId||null,provenance:data.provenance||'manuel',prixAchat:data.prixAchat}});
 await stockEvent(tx,{...lot,quantite:0},'entree',lot.quantite,lot.quantite,user,reason,documentId);await syncStock(tx,lot.medicamentId);return lot;
}
export async function reserveStock(tx:StockTx,itemId:string,medicamentId:string,quantity:number,user:any,documentId:string){
 if(!Number.isSafeInteger(quantity)||quantity<=0)throw Error('Quantité de stock invalide.');const lots=await tx.lotStock.findMany({where:{medicamentId,statut:'disponible',dateExpiration:{gte:expiryFloor()},quantite:{gt:0}},orderBy:[{dateExpiration:'asc'},{dateCreation:'asc'},{id:'asc'}]});
 if(lots.reduce((s,l)=>s+l.quantite,0)<quantity)throw Error('Stock disponible insuffisant. Vérifiez les lots qualifiés et les péremptions.');let rest=quantity;
 for(const lot of lots){if(!rest)break;const q=Math.min(rest,lot.quantite);await tx.lotStock.update({where:{id:lot.id},data:{quantite:{decrement:q},quantiteReservee:{increment:q}}});await tx.allocationStock.create({data:{itemVenteId:itemId,lotId:lot.id,quantite:q}});await stockEvent(tx,lot,'reservation',-q,lot.quantite-q,user,'Réservation pour la vente',documentId);rest-=q;}
 await syncStock(tx,medicamentId);
}
export async function finalizeStock(tx:StockTx,venteId:string,user:any){
 const allocations=await tx.allocationStock.findMany({where:{item:{venteId},etat:'reservee'},include:{lot:true}});
 for(const a of allocations){await tx.lotStock.update({where:{id:a.lotId},data:{quantiteReservee:{decrement:a.quantite}}});await tx.allocationStock.update({where:{id:a.id},data:{etat:'consommee'}});await stockEvent(tx,a.lot,'sortie_confirmee',0,a.lot.quantite,user,'Certification de la vente ; réservation consommée',venteId);}
}
export async function releaseStock(tx:StockTx,venteId:string,user:any){
 const allocations=await tx.allocationStock.findMany({where:{item:{venteId},etat:'reservee'},include:{lot:true}});const meds=new Set<string>();
 for(const a of allocations){await tx.lotStock.update({where:{id:a.lotId},data:{quantite:{increment:a.quantite},quantiteReservee:{decrement:a.quantite}}});await tx.allocationStock.update({where:{id:a.id},data:{etat:'liberee'}});await stockEvent(tx,a.lot,'liberation',a.quantite,a.lot.quantite+a.quantite,user,'Annulation de la vente non certifiée',venteId);meds.add(a.lot.medicamentId);}for(const id of meds)await syncStock(tx,id);
}
export async function returnStock(tx:StockTx,originalItemId:string,creditItemId:string,quantity:number,user:any,documentId:string){
 const original=await tx.itemVente.findUnique({where:{id:originalItemId},include:{allocations:{where:{etat:'consommee'},include:{lot:true}},medicament:true}});if(!original?.medicamentId)return;
 const returned=await tx.allocationStock.aggregate({where:{origineItemId:originalItemId,etat:'retour'},_sum:{quantite:true}});if(quantity+(returned._sum.quantite||0)>original.quantite*original.facteurStock)throw Error('Ce retour physique dépasse les quantités non encore retournées. Si les produits sont déjà revenus, créez l’avoir sans retour de stock.');
 let rest=quantity;for(const allocation of original.allocations){if(!rest)break;const q=Math.min(rest,allocation.quantite-allocation.quantiteRetournee);if(q<=0)continue;let lot=await tx.lotStock.findUniqueOrThrow({where:{id:allocation.lotId}});const after=lot.quantite+q;await tx.lotStock.update({where:{id:lot.id},data:{quantite:after}});await tx.allocationStock.update({where:{id:allocation.id},data:{quantiteRetournee:{increment:q}}});await tx.allocationStock.create({data:{itemVenteId:creditItemId,lotId:lot.id,quantite:q,etat:'retour',origineItemId:originalItemId,origineAllocationId:allocation.id}});await stockEvent(tx,lot,'retour',q,after,user,'Retour physique contrôlé lié à la vente d’origine',documentId);rest-=q;}
 if(rest){const lot=await addStockLot(tx,{medicamentId:original.medicamentId,quantite:rest,dateExpiration:original.medicament!.dateExpiration,statut:'a_qualifier',provenance:'retour_historique'},user,'Retour d’une vente historique sans lot identifié',documentId);await tx.allocationStock.create({data:{itemVenteId:creditItemId,lotId:lot.id,quantite:rest,etat:'retour',origineItemId:originalItemId}});}
 await syncStock(tx,original.medicamentId);
}
export async function transferLot(tx:StockTx,lotId:string,quantity:number,rayonId:string|null,user:any,reason:string){
 const lot=await tx.lotStock.findUniqueOrThrow({where:{id:lotId}});if(!Number.isInteger(quantity)||quantity<=0||quantity>lot.quantite)throw Error('Quantité à transférer invalide.');if(lot.rayonId===rayonId)throw Error('Choisissez un emplacement différent.');
 if(rayonId){const rayon=await tx.rayon.findUniqueOrThrow({where:{id:rayonId}});const count=await tx.lotStock.aggregate({where:{rayonId},_sum:{quantite:true,quantiteReservee:true}});if((count._sum.quantite||0)+(count._sum.quantiteReservee||0)+quantity>rayon.capaciteMax)throw Error('Capacité du rayon dépassée.');}
 const dest=await tx.lotStock.create({data:{medicamentId:lot.medicamentId,numero:lot.numero,dateExpiration:lot.dateExpiration,quantite:quantity,statut:lot.statut,rayonId,fournisseurId:lot.fournisseurId,prixAchat:lot.prixAchat,provenance:'transfert'}});await tx.lotStock.update({where:{id:lot.id},data:{quantite:{decrement:quantity}}});await stockEvent(tx,lot,'transfert',-quantity,lot.quantite-quantity,user,reason,undefined,dest.id);await stockEvent(tx,{...dest,quantite:0},'transfert',quantity,quantity,user,reason,undefined,lot.id);await syncStock(tx,lot.medicamentId);return dest;
}
