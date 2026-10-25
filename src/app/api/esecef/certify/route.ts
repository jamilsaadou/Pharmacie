import { assertInvoiceAccess } from '@/lib/sales-access';
import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ESECeFService } from '@/lib/esecef.service';
import { TokenCrypto } from '@/lib/token-crypto';
import { InvoiceRequestDataDto, ItemDto, PaymentDto, InvoiceType, ApiInvoiceType, TaxGroup } from '@/types/esecef';
import { validateInvoiceData, requiresOriginalReference } from '@/utils/invoiceTypeUtils';
import { normalizeInvoiceReference } from '@/utils/esecefReference';
import { computeStampDuty } from '@/utils/stampDuty';
import { getStampDutyConfig } from '@/lib/stampDutyConfig';
import { prorateAmount, resolveDiscount } from '@/lib/discount';

// POST - Certifier une facture (supporte 2 modes: avec venteId ou données directes)
export async function POST(request: NextRequest) {
  try {
    await requireUser(false,'ventes');
    const body = await request.json();
    
    // Mode 1: Avec venteId (enregistre en base)
    // Mode 2: Données directes (pas d'enregistrement)
    const isVenteMode = Boolean(body.venteId);
    
    if (isVenteMode) {
      return await certifyWithVenteId(body);
    } else {
      return NextResponse.json({ error: 'Enregistrez une vente avant sa certification pour conserver la traçabilité.' }, { status: 400 });
    }
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la certification de la facture:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erreur lors de la certification de la facture' 
      },
      { status: 500 }
    );
  }
}

// Mode 1: Certification avec venteId (enregistre dans FactureESECeF)
async function certifyWithVenteId(body: any) {
  const { venteId, typeFacture = 'FV', reference, isb } = body;

  if (!venteId) {
    return NextResponse.json(
      { error: "L'ID de la vente est requis" },
      { status: 400 }
    );
  }

  try {
    const actor=await requireUser(false,'ventes');
    const source=await prisma.vente.findUniqueOrThrow({where:{id:venteId},include:{items:true}});
    assertInvoiceAccess(actor,source.typeFacture,source.items.every(i=>!i.medicamentId));
    const { certifyVente } = await import('@/lib/business/certification');
    const result = await certifyVente(venteId, typeFacture, reference, isb);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur intevenant lors de la certification:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur inattendue lors de la certification',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET - Récupérer le statut de certification d'une facture
export async function GET(request: NextRequest) {
  try {
    await requireUser(false,'ventes');
    const { searchParams } = new URL(request.url);
    const venteId = searchParams.get('venteId');

    if (!venteId) {
      return NextResponse.json(
        { error: "L'ID de la vente est requis" },
        { status: 400 }
      );
    }

    const facture = await prisma.factureESECeF.findUnique({
      where: { venteId },
      include: {
        vente: {
          include: {
            client: true,
            items: {
              include: {
                medicament: true,
              },
            },
          },
        },
        configuration: {
          select: {
            nif: true,
            nim: true,
            environnement: true,
            isf: true,
          },
        },
      },
    });

    if (!facture) {
      return NextResponse.json(
        { error: 'Aucune facture e-SECeF trouvée pour cette vente' },
        { status: 404 }
      );
    }

    return NextResponse.json(facture);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération de la facture:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la facture' },
      { status: 500 }
    );
  }
}
