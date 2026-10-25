import {assertSalesAccess} from '@/lib/sales-access';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCertificationContext } from '@/lib/esecef-config';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
export async function POST(request: NextRequest) {
  try {
    const actor=await requireUser(false,'ventes');assertSalesAccess(actor,'pending-invoices');
    const { uid, action } = await request.json();
    if (!uid || !['confirm', 'cancel'].includes(action)) throw new Error('UID ou action invalide.');
    const demand = await prisma.demandeCertification.findUnique({ where: { uid } });
    if (!demand) throw new Error('Demande locale introuvable. Utilisez le rapprochement des demandes e‑MCF.');
    if (demand.statut === 'certifiee' && action === 'confirm') return NextResponse.json({ success: true, action, securityElements: demand.securite });
    if (demand.statut !== 'soumise') throw new Error('Cette demande est déjà finalisée ou nécessite un rapprochement.');
    const { config, service } = await getCertificationContext(demand.configurationId);
    const claim = await prisma.demandeCertification.updateMany({ where: { uid, statut: 'soumise' }, data: { statut: 'confirmation_en_cours' } });
    if (claim.count !== 1) throw new Error('Une finalisation est déjà en cours.');
    try {
      const security = await service.finalizeInvoice(uid, action === 'confirm' ? 'confirmer' : 'annuler');
      if (security.errorCode) throw new Error(security.errorDesc || `Erreur e‑MCF ${security.errorCode}`);
      if (action === 'confirm' && (!security.codeSECeFDGI || !security.qrCode || !security.counters || !security.nim || !security.dateTime)) throw new Error('Éléments de sécurité incomplets. Rapprochez cette demande avant de relancer.');
      await prisma.$transaction([
        prisma.demandeCertification.update({ where: { uid }, data: { statut: action === 'confirm' ? 'certifiee' : 'annulee', securite: JSON.parse(JSON.stringify(security)) } }),
        ...(action === 'confirm' ? [prisma.configurationESECeF.update({ where: { id: config.id }, data: { derniersCompteurs: security.counters } })] : []),
      ]);
      return NextResponse.json({ success: true, action, securityElements: security });
    } catch (error) {
      await prisma.demandeCertification.update({ where: { uid }, data: { statut: 'a_rapprocher' } });
      throw error;
    }
  } catch (error) { return apiError(error); }
}
