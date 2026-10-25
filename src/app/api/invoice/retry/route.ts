import {assertSalesAccess} from '@/lib/sales-access';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { certifyVente } from '@/lib/business/certification';
import type { InvoiceType } from '@/types/esecef';
export async function POST(request: NextRequest) {
  try {
    const actor=await requireUser(false,'ventes');assertSalesAccess(actor,'pending-invoices'); const { factureId } = await request.json();
    const facture = await prisma.factureESECeF.findUnique({ where: { id: factureId }, include: { vente: true } });
    if (!facture || !['en_attente', 'erreur'].includes(facture.statut) || facture.uid) throw new Error('Demande déjà soumise ou incertaine : rapprochez-la avec e‑MCF avant de relancer.');
    const result = await certifyVente(facture.venteId, facture.vente.typeFacture as InvoiceType, facture.vente.factureReference || undefined);
    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) { return apiError(error); }
}
