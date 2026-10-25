import {assertSalesAccess} from '@/lib/sales-access';
import {returnStock} from '@/lib/stock-ledger';
import {cashLock,activeCash} from '@/lib/cash-ledger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { creditSource, findCredits } from '@/lib/credit-notes';
import { buildReferenceFromCounters } from '@/utils/esecefReference';
import { nextInvoiceNumber } from '@/lib/invoice-number';
export async function GET(request:NextRequest){
 try{
  const user=await requireUser(false,'ventes');assertSalesAccess(user,'facture-avoir');const q=request.nextUrl.searchParams.get('q')?.trim()||'';
  const invoices=await prisma.factureESECeF.findMany({where:{statut:'certifiee',vente:{typeFacture:{in:['FV','EV']},...(q?{numeroFacture:{contains:q,mode:'insensitive'}}:{})}},include:{vente:{include:{items:true}}},orderBy:{dateCreation:'desc'},take:100});
  const results=[];for(const invoice of invoices){try{const rec=JSON.parse(invoice.requestData);const ref=buildReferenceFromCounters(rec._security?.nim,rec._security?.counters);results.push(creditSource(invoice,ref?await findCredits(prisma,ref):[]));}catch{/* Incomplete historical snapshots cannot safely generate a credit. */}}
  return NextResponse.json(results);
 }catch(error){return apiError(error);}
}
export async function POST(request:NextRequest){
 try{
  const user=await requireUser(false,'ventes');assertSalesAccess(user,'facture-avoir');const body=await request.json();
  if(!body.originalId||!Array.isArray(body.lines)||!body.lines.length||typeof body.returnToStock!=='boolean'||typeof body.requestKey!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestKey))throw new Error('Facture d’origine, articles et choix de retour physique requis.');
  const result=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
   const invoice=await tx.factureESECeF.findUnique({where:{id:body.originalId},include:{vente:{include:{items:true}}}});if(!invoice)throw new Error('Facture d’origine introuvable.');
   const original=JSON.parse(invoice.requestData);const reference=buildReferenceFromCounters(original._security?.nim,original._security?.counters);if(!reference)throw new Error('Référence fiscale d’origine absente.');
   const credits=await findCredits(tx,reference);
   const duplicate=credits.find((credit:any)=>JSON.parse(credit.requestData)._creditOrigin?.requestKey===body.requestKey);
   if(duplicate)return {venteId:duplicate.venteId,numeroFacture:duplicate.numeroFacture,total:duplicate.vente.total,reference};
   const source=creditSource(invoice,credits);const seen=new Set();
   const selected=body.lines.map((line:any)=>{if(!Number.isInteger(line.index)||seen.has(line.index)||!Number.isInteger(line.quantity)||line.quantity<=0)throw new Error('Articles ou quantités d’avoir invalides.');seen.add(line.index);const item=source.items[line.index];if(!item||line.quantity>item.remaining)throw new Error('Quantité supérieure au solde de la facture d’origine.');return {...item,quantity:line.quantity};});
   const groups:Record<string,number>={};for(const item of selected)groups[item.taxGroup]=(groups[item.taxGroup]||0)+item.price*item.quantity;
   let total=0,tva=0;for(const [group,amount]of Object.entries(groups)){const rate=source.taxRates?.[group.toLowerCase()];if(!Number.isFinite(rate))throw new Error('Taux fiscal historique absent.');const ttc=source.mode==='ht'?Math.round(amount*(1+rate/100)):amount;const ht=source.mode==='ht'?amount:Math.round(ttc/(1+rate/100));total+=ttc;tva+=ttc-ht;}
   if(source.isb){const isbRate=source.taxRates?.[`isb${source.isb}`];if(!Number.isFinite(isbRate))throw Error('Taux ISB historique absent.');total+=Math.round(total*isbRate/100);}
   await cashLock(tx);const cash=await activeCash(tx,user.id);
   const config=await tx.configurationESECeF.findUnique({where:{id:invoice.configurationId}});if(!config)throw new Error('Configuration e‑MCF introuvable.');
   const numeroFacture=await nextInvoiceNumber(tx,config.nim);
   const sale=await tx.vente.create({data:{operateurId:user.id,caisseId:cash?.id,numeroFacture,clientId:invoice.vente.clientId,sousTotal:selected.reduce((s:number,i:any)=>s+i.price*i.quantity,0),remise:0,remiseType:'PERCENT',remiseValeur:0,remiseMontant:0,tva,total,methodePaiement:invoice.vente.methodePaiement,statut:'en_cours',vendeur:`${user.prenom} ${user.nom}`,typeFacture:source.type==='EV'?'EA':'FA',factureReference:reference,retourStock:body.returnToStock}});
   for(const item of selected){const creditItem=await tx.itemVente.create({data:{venteId:sale.id,medicamentId:item.medicamentId,libelle:item.name,code:item.code,quantite:item.quantity,prixUnitaire:item.price,facteurStock:item.facteurStock,remise:0,sousTotal:item.price*item.quantity,groupeTaxation:item.taxGroup}});if(body.returnToStock&&item.originalItemId)await returnStock(tx,item.originalItemId,creditItem.id,item.quantity*item.facteurStock,user,sale.id);}

   const origin={requestKey:body.requestKey,originalId:invoice.id,reference,mode:original.mode,isb:original.isb||null,nif:original.nif,isf:original.isf,client:original.client||null,issuer:original._issuer,lines:selected.map((i:any)=>({index:i.index,quantity:i.quantity,item:original.items[i.index]}))};
   await tx.factureESECeF.create({data:{venteId:sale.id,numeroFacture:sale.numeroFacture,configurationId:invoice.configurationId,statut:'en_attente',requestData:JSON.stringify({_creditOrigin:origin}),tentatives:0}});
   return {venteId:sale.id,numeroFacture:sale.numeroFacture,total,reference};
  });return NextResponse.json(result,{status:201});
 }catch(error){return apiError(error);}
}
