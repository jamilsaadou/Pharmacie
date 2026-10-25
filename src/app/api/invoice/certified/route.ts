import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/invoice/certified
 * Récupère la liste des factures certifiées
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const isbOnly = searchParams.get('isbOnly') === '1';

    const skip = (page - 1) * limit;

    // Construire les conditions de recherche
    const where: any = {
      statut: 'certifiee',
    };

    // Recherche par numéro de facture ou code SECeF
    if (search) {
      where.OR = [
        { numeroFacture: { contains: search } },
        { codeSECeFDGI: { contains: search } },
        { uid: { contains: search } },
      ];
    }

    // Filtre par date
    if (dateFrom || dateTo) {
      where.dateTimeCertification = {};
      if (dateFrom) {
        where.dateTimeCertification.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.dateTimeCertification.lte = new Date(dateTo + 'T23:59:59');
      }
    }

    if (isbOnly) {
      where.requestData = { contains: '"isb"' };
    }

    // Récupérer les factures certifiées avec pagination
    const [factures, total] = await Promise.all([
      prisma.factureESECeF.findMany({
        where,
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
        orderBy: {
          dateTimeCertification: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.factureESECeF.count({ where }),
    ]);

    // Formater les données pour le frontend
    const facturesFormatted = factures.map((f) => {
      let isbGroup: string | null = null;
      let fiscalItems: any[] = [];
      try {
        const parsed = JSON.parse(f.requestData);
        if (parsed?.isb) isbGroup = parsed.isb;
        fiscalItems = Array.isArray(parsed.items) ? parsed.items : [];
      } catch {
        isbGroup = null;
      }

      return ({
      id: f.id,
      numeroFacture: f.numeroFacture,
      uid: f.uid,
      codeSECeFDGI: f.codeSECeFDGI,
      qrCode: f.qrCode,
      counters: f.counters,
      typeFacture: f.vente?.typeFacture || 'FV',
      dateTimeCertification: f.dateTimeCertification,
      dateCreation: f.dateCreation,
      isbGroup,
      vente: f.vente ? {
        id: f.vente.id,
        numeroFacture: f.vente.numeroFacture,
        date: f.vente.date,
        total: f.vente.total,
        vendeur: f.vente.vendeur,
        modePaiement: f.vente.methodePaiement,
        client: f.vente.client ? {
          id: f.vente.client.id,
          nom: f.vente.client.nom,
          prenom: f.vente.client.prenom,
          telephone: f.vente.client.telephone,
        } : null,
        items: f.vente.items.length ? f.vente.items.map((item) => ({
          id: item.id,
          quantite: item.quantite,
          prixUnitaire: item.prixUnitaire,
          remise: item.remise,
          sousTotal: item.sousTotal,
          groupeTaxation: item.groupeTaxation,
          libelle: item.libelle,
          code: item.code,
          medicament: item.medicament ? {
            id: item.medicament.id,
            nom: item.medicament.nom,
            codeBarres: item.medicament.codeBarres,
          } : null,
        })) : fiscalItems.map((item, index) => ({
          id: `${f.id}-fiscal-${index}`, quantite: item.quantity, prixUnitaire: item.price,
          remise: 0, sousTotal: Math.round(item.price * item.quantity), groupeTaxation: item.taxGroup,
          libelle: item.name, code: item.code, medicament: null,
        })),
        itemsCount: f.vente.items.length || fiscalItems.length,
      } : null,
    })});

    return NextResponse.json({
      success: true,
      factures: facturesFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur dans /api/invoice/certified:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erreur lors de la récupération des factures certifiées',
      },
      { status: 500 }
    );
  }
}
