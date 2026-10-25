import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
export async function GET(request: NextRequest) {
  try {
    await requireUser(); const venteId=request.nextUrl.searchParams.get('venteId'); const id=request.nextUrl.searchParams.get('factureId');
    const uid=request.nextUrl.searchParams.get('demandeUid');
    if(!venteId&&!id&&!uid) throw new Error('Identifiant de facture requis.');
    let facture:any=uid?null:await prisma.factureESECeF.findFirst({where:id?{id}:{venteId:venteId!},include:{vente:{include:{client:true}},configuration:true}});
    if(uid){const demand=await prisma.demandeCertification.findUnique({where:{uid}});if(demand?.statut==='certifiee'){const req=demand.requete as any;facture={statut:'certifiee',numeroFacture:req.rn||uid,requestData:JSON.stringify({...req,_totals:demand.totaux,_security:demand.securite}),configuration:await prisma.configurationESECeF.findUniqueOrThrow({where:{id:demand.configurationId}}),vente:{methodePaiement:'especes'}};}}
    if(!facture||facture.statut!=='certifiee') throw new Error('Cette facture n’est pas certifiée.');
    const record=JSON.parse(facture.requestData); const config=facture.configuration;
    const issuer=record._issuer; const totals=record._totals; const security=record._security;
    if(!issuer||!totals||!security) throw new Error('Instantané fiscal incomplet. Rapprochez la facture avec e‑MCF avant de l’imprimer.');
    const groups:Record<string,any>={};
    for(const item of record.items) {
      const letter=item.taxGroup.toLowerCase(); if(groups[item.taxGroup]) continue;
      const tva=totals['va'+letter]; const ht=totals['ha'+letter]; const rate=totals['t'+letter]??issuer.taxRates?.[letter];
      if(!Number.isFinite(rate)||!Number.isFinite(tva)||!Number.isFinite(ht)) throw new Error('Totaux officiels par groupe fiscal incomplets.');
      const ts=record.items.filter((i:any)=>i.taxGroup===item.taxGroup).reduce((sum:number,i:any)=>sum+(Number(i.taxSpecificAmount)||0),0);
      groups[item.taxGroup]={totalHT:ht-ts,totalTVA:tva,tauxTVA:rate,totalTS:ts};
    }
    return NextResponse.json({
      environnement:issuer.environnement,pharmacieName:issuer.nomEtablissement,raisonSociale:issuer.raisonSociale,nif:record.nif,rccm:issuer.rccm,adresse:issuer.adresse,telephone:issuer.telephone,email:issuer.email,boitePostale:issuer.boitePostale,
      modePrix:record.mode.toLowerCase(),commentaires:['cmta','cmtb','cmtc','cmtd','cmte','cmtf','cmtg','cmth'].map(k=>record[k]).filter(Boolean),isf:record.isf,typeFacture:record.type,numeroFacture:facture.numeroFacture,isCopie:request.nextUrl.searchParams.get('copie')==='1',referenceFactureOriginale:record.reference,
      operateur:record.operator.name,client:record.client?{nom:record.client.name,nif:record.client.nif,adresse:record.client.address,contact:record.client.contact}:undefined,
      dateEtablissement:security.dateTime,
      items:record.items.map((item:any)=>{const rate=groups[item.taxGroup].tauxTVA;const price=item.price;return {nom:item.name,code:item.code,quantite:item.quantity,prixUnitaire:price,montant:Math.round(price*item.quantity+(Number(item.taxSpecificAmount)||0)*(record.mode.toLowerCase()==='ht'?1:1+rate/100)),groupeTaxation:item.taxGroup,taxeSpecifique:item.taxSpecificAmount,taxeSpecifiqueDesc:item.taxSpecificValue,prixOriginal:item.originalPrice,descriptionModification:item.priceModification};}),
      totauxParGroupe:groups,totalTVA:totals.vtotal,totalTTC:totals.total,isbTotal:totals.isb,isbTaux:record.isb,taxeSpecifiqueTotal:totals.ts,paiements:record.payment?.length?record.payment:[{type:facture.vente.methodePaiement,montant:totals.total}],
      securityElements:{codeSECeFDGI:security.codeSECeFDGI,nim:security.nim,compteurs:security.counters,dateHeure:security.dateTime,qrCodeData:security.qrCode}
    });
  } catch(error) {return apiError(error);}
}
