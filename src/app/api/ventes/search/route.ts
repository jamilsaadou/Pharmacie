import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Rechercher une vente par Code SECeF/DGI ou numéro de facture
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const codeSECeF = searchParams.get('codeSECeF');
    const numeroFacture = searchParams.get('numeroFacture');

    if (!codeSECeF && !numeroFacture) {
      return NextResponse.json(
        { error: 'Veuillez fournir un Code SECeF/DGI ou un numéro de facture' },
        { status: 400 }
      );
    }

    let vente = null;

    if (codeSECeF) {
      // Rechercher par Code SECeF/DGI via la table FactureESECeF
      const factureESECeF = await prisma.factureESECeF.findFirst({
        where: {
          codeSECeFDGI: codeSECeF,
          statut: 'certifiee',
        },
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
        },
      });

      if (factureESECeF) {
        vente = {
          ...factureESECeF.vente,
          factureESECeF: {
            codeSECeFDGI: factureESECeF.codeSECeFDGI,
            qrCode: factureESECeF.qrCode,
            dateTimeCertification: factureESECeF.dateTimeCertification,
            counters: factureESECeF.counters,
          },
        };
      }
    } else if (numeroFacture) {
      // Rechercher par numéro de facture
      vente = await prisma.vente.findFirst({
        where: {
          numeroFacture: {
            contains: numeroFacture,
          },
        },
        include: {
          client: true,
          items: {
            include: {
              medicament: true,
            },
          },
          factureESECeF: {
            select: {
              codeSECeFDGI: true,
              qrCode: true,
              dateTimeCertification: true,
              counters: true,
              statut: true,
            },
          },
        },
      });
    }

    if (!vente) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que c'est une facture de vente (FV) pour pouvoir créer une FA
    if (vente.typeFacture !== 'FV' && vente.typeFacture !== 'EV') {
      return NextResponse.json(
        {
          error: 'Seules les factures de vente (FV) ou tickets (EV) peuvent être annulées par une facture d\'avoir',
          typeFacture: vente.typeFacture,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(vente);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la recherche de facture:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de facture' },
      { status: 500 }
    );
  }
}
