import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/invoice/pending/db
 * Récupère toutes les factures en attente, en erreur ou soumises depuis la base de données
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get('statut');

    // Construire le filtre
    const where: any = {};
    
    if (statut) {
      where.statut = statut;
    } else {
      // Par défaut, récupérer les factures en attente, soumises ou en erreur
      where.statut = {
        in: ['en_attente', 'soumise', 'erreur', 'confirmation_en_cours', 'a_rapprocher']
      };
    }

    // Récupérer les factures avec leurs relations
    const facturesEnAttente = await prisma.factureESECeF.findMany({
      where,
      include: {
        vente: {
          include: {
            client: true,
            items: {
              include: {
                medicament: true
              }
            }
          }
        },
        configuration: true
      },
      orderBy: {
        dateCreation: 'desc'
      }
    });

    // Formater les données pour l'affichage
    const facturesFormatees = facturesEnAttente.map(facture => ({
      id: facture.id,
      numeroFacture: facture.numeroFacture,
      venteId: facture.venteId,
      statut: facture.statut,
      uid: facture.uid,
      codeSECeFDGI: facture.codeSECeFDGI,
      dateTimeCertification: facture.dateTimeCertification,
      errorCode: facture.errorCode,
      errorDescription: facture.errorDescription,
      tentatives: facture.tentatives,
      derniereTentative: facture.derniereTentative,
      dateCreation: facture.dateCreation,
      vente: {
        numeroFacture: facture.vente.numeroFacture,
        date: facture.vente.date,
        total: facture.vente.total,
        client: facture.vente.client ? {
          nom: facture.vente.client.nom,
          prenom: facture.vente.client.prenom,
          telephone: facture.vente.client.telephone
        } : null,
        vendeur: facture.vente.vendeur,
        itemsCount: facture.vente.items.length
      }
    }));

    return NextResponse.json({
      success: true,
      factures: facturesFormatees,
      count: facturesFormatees.length
    });

  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur dans /api/invoice/pending/db:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de la récupération des factures en attente',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/** Historical generic edits must never bypass the certification state machine. */
export async function PUT() {
  try {
    await requireUser();
    return NextResponse.json({ error: 'Utilisez les actions de certification ou d’annulation dédiées. Un statut fiscal ne peut pas être modifié manuellement.' }, { status: 409 });
  } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try {
    await requireUser();
    return NextResponse.json({ error: 'L’historique fiscal doit être conservé. Annulez une demande provisoire avec l’action dédiée, ou établissez un avoir pour une facture certifiée.' }, { status: 409 });
  } catch (error) { return apiError(error); }
}
