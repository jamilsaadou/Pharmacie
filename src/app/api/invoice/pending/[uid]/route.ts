import {stockLock,finalizeStock} from '@/lib/stock-ledger';
import {cashLock,recordCash} from '@/lib/cash-ledger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { getCertificationContext } from '@/lib/esecef-config';
import { POST as cancelVente } from '@/app/api/invoice/cancel/route';
import { POST as finalizeDemand } from '@/app/api/invoice/finalize/route';
type Context = { params: Promise<{ uid: string }> };
export async function GET(request: NextRequest, context: Context) {
  try { await requireUser(); const { uid } = await context.params; const local = await prisma.factureESECeF.findFirst({ where: { uid } }); const demand = await prisma.demandeCertification.findUnique({ where: { uid } }); const { service } = await getCertificationContext(local?.configurationId || demand?.configurationId); const details = await service.getPendingInvoiceDetails(uid); if (details.errorCode) throw new Error(details.errorDesc || 'Demande introuvable sur e‑MCF.'); return NextResponse.json({ success: true, details }); } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try { await requireUser(); const { uid } = await context.params; const local = await prisma.factureESECeF.findFirst({ where: { uid } }); if (local) return cancelVente(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ factureId: local.id }) })); return finalizeDemand(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ uid, action: 'cancel' }) })); } catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireUser(); const { uid } = await context.params;
    const local = await prisma.factureESECeF.findFirst({ where: { uid } });
    if (!local) return finalizeDemand(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ uid, action: 'confirm' }) }));
    if (local.statut !== 'soumise') throw new Error('Cette demande doit être rapprochée ou est déjà finalisée.');
    const { config, service } = await getCertificationContext(local.configurationId);
    const claim = await prisma.factureESECeF.updateMany({ where: { id: local.id, statut: 'soumise' }, data: { statut: 'confirmation_en_cours' } });
    if (claim.count !== 1) throw new Error('Une finalisation est déjà en cours.');
    try {
      const security = await service.finalizeInvoice(uid, 'confirmer');
      if (security.errorCode || !security.codeSECeFDGI || !security.qrCode || !security.nim || !security.counters || !security.dateTime) throw new Error(security.errorDesc || 'Confirmation e‑MCF incomplète.');
      await prisma.$transaction(async tx=>{await stockLock(tx);await cashLock(tx);
        await tx.factureESECeF.update({where:{id:local.id},data:{statut:'certifiee',requestData:JSON.stringify({...JSON.parse(local.requestData),_security:security}),codeSECeFDGI:security.codeSECeFDGI,qrCode:security.qrCode,counters:security.counters,dateTimeCertification:new Date()}});
        await tx.vente.update({where:{id:local.venteId},data:{statut:'terminee'}});await finalizeStock(tx,local.venteId,null);await recordCash(tx,local.venteId);
        await tx.configurationESECeF.update({where:{id:config.id},data:{derniersCompteurs:security.counters}});
      });
      return NextResponse.json({ success: true, securityElements: security });
    } catch (error) { await prisma.factureESECeF.update({ where: { id: local.id }, data: { statut: 'a_rapprocher' } }); throw error; }
  } catch (error) { return apiError(error); }
}
