import { releaseStock } from '@/lib/stock-ledger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCertificationContext } from '@/lib/esecef-config';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
async function cancel(factureId: string, actor: any) {
  const facture = await prisma.factureESECeF.findUnique({ where: { id: factureId }, include: { vente: { include: { items: true } } } });
  if (!facture) throw new Error('Facture introuvable.');
  if (facture.statut === 'certifiee') throw new Error('Une facture certifiée nécessite un avoir.');
  if (facture.statut === 'annulee') return;
  if (['a_rapprocher', 'confirmation_en_cours'].includes(facture.statut)) throw new Error('Rapprochez la demande avec e‑MCF avant son annulation.');
  if (facture.uid) {
    const { service } = await getCertificationContext(facture.configurationId);
    const result = await service.finalizeInvoice(facture.uid, 'annuler');
    // Le code 20 est ambigu : déjà certifiée ou annulée. Ne jamais supposer une annulation.
    if (result.errorCode) throw new Error(result.errorDesc || 'L’annulation e‑MCF n’est pas confirmée.');
  }
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
    const updated = await tx.factureESECeF.updateMany({ where: { id: facture.id, statut: facture.statut }, data: { statut: 'annulee' } });
    if (updated.count !== 1) throw new Error('La demande a changé. Actualisez son état.');
    await tx.vente.update({ where: { id: facture.venteId }, data: { statut: 'annulee' } });
    await releaseStock(tx,facture.venteId,actor);
  });
}
export async function POST(request: NextRequest) {
  try { const actor=await requireUser(false,'ventes'); const { factureId } = await request.json(); if (!factureId) throw new Error('ID de facture requis.'); await cancel(factureId,actor); return NextResponse.json({ success: true, cancelledOnApi: true, message: 'Demande annulée, réservation de stock libérée.' }); } catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest) {
  try {
    const actor=await requireUser(false,'ventes'); const { factureIds } = await request.json(); if (!Array.isArray(factureIds) || !factureIds.length || factureIds.length > 100) throw new Error('Liste de demandes invalide.');
    const details = [];
    for (const id of factureIds) { try { await cancel(id,actor); details.push({ factureId: id, success: true }); } catch (e) { details.push({ factureId: id, success: false, error: e instanceof Error ? e.message : 'Échec' }); } }
    const cancelled = details.filter(d => d.success).length;
    return NextResponse.json({ success: cancelled === details.length, results: { total: details.length, cancelled, errors: details.length - cancelled, details } });
  } catch (error) { return apiError(error); }
}
