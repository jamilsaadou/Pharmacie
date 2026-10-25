export const isCredit=(type:string)=>['FA','EA'].includes(type);
export function summarizeClientGroups(groups:any[]){
 const summary={purchases:0,credits:0,purchaseAmount:0,creditAmount:0,netAmount:0,lastPurchase:null as string|null};
 for(const g of groups){const n=g._count?._all||0,amount=Math.abs(g._sum?.total||0);if(['FV','EV'].includes(g.typeFacture)){summary.purchases+=n;summary.purchaseAmount+=amount;const date=g._max?.date?new Date(g._max.date).toISOString():null;if(date&&(!summary.lastPurchase||date>summary.lastPurchase))summary.lastPurchase=date;}else if(isCredit(g.typeFacture)){summary.credits+=n;summary.creditAmount+=amount;}}
 summary.netAmount=summary.purchaseAmount-summary.creditAmount;return summary;
}
export function clientHistoryRow(v:any){
 const f=v.factureESECeF;let record:any={};try{record=JSON.parse(f?.requestData||'{}');}catch{}
 const credit=isCredit(v.typeFacture),certified=f?.statut==='certifiee';
 return{id:v.id,factureId:f?.id,number:v.numeroFacture,date:v.date,type:v.typeFacture,credit,status:v.statut,certification:f?.statut||'non_soumise',certified,amount:(credit?-1:1)*Math.abs(v.total),discount:{type:v.remiseType,value:v.remiseValeur??v.remise,amount:v.remiseMontant},payment:v.methodePaiement,operator:v.vendeur,originalId:record._creditOrigin?.originalId||null,originalReference:v.factureReference||null,fiscalReference:record._security?.nim&&record._security?.counters?record._security.nim+'-'+record._security.counters.split(' ')[0].split('/')[1]:null,historicalClient:record.client||null,
 items:certified&&record.items?record.items.map((i:any)=>({name:i.name,quantity:i.quantity,price:i.price,amount:i.price*i.quantity,taxGroup:i.taxGroup,discount:i.priceModification||null})):v.items.map((i:any)=>({name:i.libelle||i.medicament?.nom||'Article',quantity:i.quantite,price:i.prixUnitaire,amount:i.sousTotal,taxGroup:i.groupeTaxation,discount:i.remise?`${i.remise} %`:null}))};
}
export function dayBoundary(day:string,next=false){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Date invalide.');const d=new Date(day+'T00:00:00+01:00');if(!Number.isFinite(d.getTime())||new Date(d.getTime()+3600000).toISOString().slice(0,10)!==day)throw Error('Date invalide.');if(next)d.setUTCDate(d.getUTCDate()+1);return d;}
