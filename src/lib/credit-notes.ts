import { assertSupportedInvoice } from './invoice-scope';
import { prisma } from './prisma';
import { buildReferenceFromCounters } from '@/utils/esecefReference';
export function creditSource(facture: any, credits: any[]) {
  const record=JSON.parse(facture.requestData);
  assertSupportedInvoice(record.type,record.items);
  if(facture.statut!=='certifiee'||!['FV','EV'].includes(record.type)||!record._security||!record._issuer||!record._totals) throw new Error('Choisissez une facture de vente certifiée avec son instantané complet.');
  if (record.items.some((item:any)=>item.taxSpecificAmount || item.taxSpecificValue)) throw new Error('Les avoirs avec taxe spécifique nécessitent un traitement fiscal dédié.');
  const reference=buildReferenceFromCounters(record._security.nim,record._security.counters);
  if(!reference) throw new Error('Référence fiscale d’origine incomplète.');
  const used:Record<number,number>={};
  for(const credit of credits){
    const snapshot=JSON.parse(credit.requestData);if(credit.vente?.statut==='annulee'||credit.statut==='annulee')continue;
    if(snapshot._creditOrigin?.originalId===facture.id){for(const line of snapshot._creditOrigin.lines)used[line.index]=(used[line.index]||0)+line.quantity;}
    else if(credit.vente?.factureReference===reference){
      for(const line of credit.vente.items||[]){const index=facture.vente.items.findIndex((item:any)=>item.medicamentId?item.medicamentId===line.medicamentId:item.libelle===line.libelle);if(index>=0)used[index]=(used[index]||0)+line.quantite;}
    }
  }
  return {id:facture.id,numeroFacture:facture.numeroFacture,reference,type:record.type,mode:record.mode,isb:record.isb||null,client:record.client||null,date:record._security.dateTime,taxRates:record._issuer.taxRates,
    items:record.items.map((item:any,index:number)=>({...item,index,remaining:Math.max(0,item.quantity-(used[index]||0)),medicamentId:facture.vente.items[index]?.medicamentId||null,originalItemId:facture.vente.items[index]?.id||null,facteurStock:facture.vente.items[index]?.facteurStock||1}))};
}
export async function findCredits(tx:any,reference:string){return tx.factureESECeF.findMany({where:{vente:{typeFacture:{in:['FA','EA']},factureReference:reference}},include:{vente:{include:{items:true}}}});}
