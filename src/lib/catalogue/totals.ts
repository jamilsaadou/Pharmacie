import { resolveDiscount, prorateAmount, DiscountType } from '@/lib/discount';
import { computeStampDuty } from '@/utils/stampDuty';
type Line = { medicament: { prix:number; groupeTaxation?:string }; quantite:number; remise:number; remiseType:DiscountType };
export function computeCartTotals(cart: Line[], globalDiscount: number, globalDiscountType: DiscountType, mode: 'TTC'|'HT', rates: Record<string, number>, threshold: number, stamp: number) {
  const lines=cart.map(i=>({item:i,net:resolveDiscount({baseAmount:i.medicament.prix*i.quantite,type:i.remiseType,value:i.remise}).netAmount}));
  const sousTotal=lines.reduce((s,l)=>s+l.net,0); const discount=resolveDiscount({baseAmount:sousTotal,type:globalDiscountType,value:globalDiscount}); const shares=prorateAmount(lines.map(l=>l.net),discount.discountAmount);
  const groups:Record<string,number>={}; lines.forEach((l,index)=>{const group=l.item.medicament.groupeTaxation||'B';groups[group]=(groups[group]||0)+Math.round(Math.max(0,l.net-shares[index])/l.item.quantite)*l.item.quantite;});
  const roundingAdjustment=Object.values(groups).reduce((sum,amount)=>sum+amount,0)-(sousTotal-discount.discountAmount);
  let tva=0,baseTotal=0; const details:Record<string,{ht:number;ttc:number}>={};
  for(const [group,amount] of Object.entries(groups)) {const rate=rates[group.toLowerCase()]??0;const ttc=mode==='HT'?Math.round(amount*(1+rate/100)):amount;const ht=mode==='HT'?amount:Math.round(ttc/(1+rate/100));details[group]={ht,ttc};tva+=ttc-ht;baseTotal+=ttc;}
  const stampAmount=computeStampDuty(baseTotal,threshold,stamp);
  return {roundingAdjustment,sousTotal,globalDiscountAmount:discount.discountAmount,globalDiscountPercent:discount.discountPercent,tva,total:baseTotal+stampAmount,stampAmount,totalGroupeA:details.A?.ttc||0,totalGroupeB:details.B?.ht||0,totalGroupeB_HT:details.B?.ht||0,totalGroupeB_TTC:details.B?.ttc||0};
}
