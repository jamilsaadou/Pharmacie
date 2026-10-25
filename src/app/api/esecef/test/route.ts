import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCertificationContext } from '@/lib/esecef-config';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';

export async function POST() {
  try {
    await requireUser(true);
    const { config, service } = await getCertificationContext();
    const [status, info, taxes, invoiceTypes, paymentTypes] = await Promise.all([service.getStatus(), service.getEmcfInfo(), service.getTaxGroups(), service.getInvoiceTypes(), service.getPaymentTypes()]);
    const counter = info.emcfList?.find(e => e.nim === config.nim && e.status === 'Actif');
    if (!status.status || !info.status || status.nif !== config.nif || info.nif !== config.nif || status.nim !== config.nim || !counter) throw new Error('Le jeton ne correspond pas au NIF et au compteur actif configurés.');
    const expiry = new Date(status.tokenValid);
    if (!Number.isFinite(expiry.getTime()) || expiry <= new Date()) throw new Error('Le jeton a expiré ou sa validité est inconnue.');
    await prisma.configurationESECeF.update({ where: { id: config.id }, data: { tokenValidUntil: expiry, lastTokenCheck: new Date(), derniereSynchro: new Date(), catalogueFiscal: { taxes: JSON.parse(JSON.stringify(taxes)), invoiceTypes: JSON.parse(JSON.stringify(invoiceTypes)), paymentTypes: JSON.parse(JSON.stringify(paymentTypes)) } } });
    return NextResponse.json({ success: true, version: status.version, nif: status.nif, nim: status.nim, tokenValid: status.tokenValid, serverDateTime: status.serverDateTime, pendingRequestsCount: status.pendingRequestsCount, emcfList: info.emcfList, taxes, invoiceTypes, paymentTypes });
  } catch (error) { return apiError(error); }
}
