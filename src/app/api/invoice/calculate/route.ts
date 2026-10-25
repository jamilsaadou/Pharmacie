import { assertSupportedInvoice } from '@/lib/invoice-scope';
import {assertInvoiceAccess} from '@/lib/sales-access';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCertificationContext, getRegisteredIssuer } from '@/lib/esecef-config';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import type { InvoiceRequestDataDto } from '@/types/esecef';
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(false,'ventes');
    const { invoiceData: data } = await request.json() as { invoiceData: InvoiceRequestDataDto };
    assertInvoiceAccess(user,data?.type,!!data?.isb);
    if (!data || !Array.isArray(data.items) || !data.items.length) throw new Error('Ajoutez au moins un article.');
    if (!['FV', 'FT', 'FA', 'EV', 'ET', 'EA'].includes(data.type)) throw new Error('Type de facture invalide.');
    for (const i of data.items) if (!i.name?.trim() || !Number.isSafeInteger(i.price) || i.price < 0 || !Number.isFinite(i.quantity) || i.quantity <= 0 || !/^[A-P]$/.test(i.taxGroup)) throw new Error('Article invalide : vérifiez le nom, le prix en FCFA, la quantité et le groupe fiscal.');
    if (['FA', 'EA'].includes(data.type) && !data.reference) throw new Error('La référence de la facture d’origine est obligatoire.');
    if (data.isb === 'A' && !data.client?.nif) throw new Error('Le précompte ISB 2 % nécessite le NIF du client.');
    assertSupportedInvoice(data.type,data.items);
    const { config, service } = await getCertificationContext();
    const status = await service.getStatus();
    if (!status.status || status.nif !== config.nif || status.nim !== config.nim) throw new Error('Vérifiez l’identité du compteur et la connexion.');
    if (status.pendingRequestsCount >= 10) throw new Error('Finalisez les demandes en attente avant de soumettre une nouvelle facture.');
    const registeredIssuer=await getRegisteredIssuer(config,service);
    const invoice = { ...data, nif: config.nif, isf: config.isf, mode: config.modePrix.toLowerCase() as 'ttc' | 'ht', operator: { name: registeredIssuer.nomEtablissement || `${user.prenom} ${user.nom}` } };
    const totals = await service.submitInvoice(invoice);
    if (totals.errorCode) throw new Error(totals.errorDesc || `Erreur e‑MCF ${totals.errorCode}`);
    if (!totals.uid) throw new Error('Réponse e‑MCF sans UID. Consultez les demandes en attente avant toute nouvelle soumission.');
    const issuerRows = await prisma.parametres.findMany({where:{cle:{startsWith:'entreprise.'}}});
    const issuer = {environnement:config.environnement,taxRates:(config.catalogueFiscal as any)?.taxes,...Object.fromEntries(issuerRows.map(row=>[row.cle.replace('entreprise.',''),row.valeur])),...registeredIssuer};
    await prisma.demandeCertification.create({ data: { uid: totals.uid, configurationId: config.id, requete: JSON.parse(JSON.stringify({...invoice,_issuer:issuer})), totaux: JSON.parse(JSON.stringify(totals)) } });
    const detailed = await service.getPendingInvoiceDetails(totals.uid);
    if (detailed.errorCode || !detailed.totals) throw new Error('Totaux détaillés indisponibles : rapprochez la demande e‑MCF avant de recommencer.');
    Object.assign(totals, detailed.totals);
    await prisma.demandeCertification.update({where:{uid:totals.uid},data:{totaux:JSON.parse(JSON.stringify(totals))}});
    return NextResponse.json({ success: true, uid: totals.uid, totals, message: 'Demande soumise. Vérifiez les totaux avant de confirmer.' });
  } catch (error) { return apiError(error); }
}
