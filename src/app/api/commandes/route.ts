import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer toutes les commandes
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const fournisseurId = searchParams.get('fournisseurId');
    const statut = searchParams.get('statut');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');

    // Construction des filtres
    const where: any = {};

    if (fournisseurId) {
      where.fournisseurId = fournisseurId;
    }

    if (statut) {
      where.statut = statut;
    }

    if (dateDebut && dateFin) {
      where.date = {
        gte: new Date(dateDebut),
        lte: new Date(dateFin),
      };
    }

    const commandes = await prisma.commandeFournisseur.findMany({
      where,
      include: {
        fournisseur: true,
        items: {
          include: {
            medicament: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(commandes);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle commande
export async function POST(request: NextRequest) {
  try {
    await requireUser(false, 'commandes');
    const body = await request.json();
    const { fournisseurId, items, dateReception } = body;
    if(!Array.isArray(items)||items.some(i=>!Number.isInteger(i.quantiteCommandee)||i.quantiteCommandee<=0||!Number.isSafeInteger(i.prixUnitaire)||i.prixUnitaire<0))throw Error("Articles ou quantités commandées invalides.");

    // Validation
    if (!fournisseurId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Fournisseur et items requis' },
        { status: 400 }
      );
    }

    // Calcul du total
    let total = 0;
    const itemsData = items.map((item: any) => {
      const sousTotal = item.quantiteCommandee * item.prixUnitaire;
      total += sousTotal;
      return {
        quantiteRecue:0,
        medicamentId: item.medicamentId,
        quantiteCommandee: item.quantiteCommandee,
        prixUnitaire: item.prixUnitaire,
        sousTotal,
      };
    });

    // Génération du numéro de commande unique
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const numeroCommande = `CMD${year}${month}${day}-${random}`;

    // Création de la commande
    const commande = await prisma.commandeFournisseur.create({
      data: {
        numeroCommande,
        fournisseurId,
        statut: 'en_attente',
        total,
        dateReception: dateReception ? new Date(dateReception) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        fournisseur: true,
        items: {
          include: {
            medicament: true,
          },
        },
      },
    });

    return NextResponse.json(commande, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la création de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour le statut d'une commande
export async function PATCH(request: NextRequest) {
  try {
    await requireUser(false, 'commandes');
    const body = await request.json();
    const { id, statut, dateReception, items } = body;

    if (!id || !statut) {
      return NextResponse.json(
        { error: 'ID et statut requis' },
        { status: 400 }
      );
    }

    const updateData: any = {
      statut,
    };

    if (dateReception) {
      updateData.dateReception = new Date(dateReception);
    }

    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
      const commande = await tx.commandeFournisseur.findUnique({ where: { id }, include: { items: true } });
      if (!commande) throw new Error('Commande introuvable.');
      if (!['en_attente','confirmee','livree','annulee'].includes(statut)) throw new Error('Statut invalide.');
      if (commande.statut === 'livree') { if (statut === 'livree') return; throw new Error('Une commande réceptionnée conserve son historique.'); }
      if (commande.statut === 'annulee') throw new Error('Cette commande est annulée.');
      if(statut==='livree')throw Error('Utilisez Réceptionner pour enregistrer les lots et les péremptions.');
      if(commande.statut==='partielle')throw Error('Une commande partiellement reçue conserve son historique et son reliquat.');
      await tx.commandeFournisseur.update({where:{id},data:updateData});
    });

    const commandeUpdated = await prisma.commandeFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        items: {
          include: {
            medicament: true,
          },
        },
      },
    });

    return NextResponse.json(commandeUpdated);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    return apiError(error);
    console.error('Erreur lors de la mise à jour de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une commande
export async function DELETE(request: NextRequest) {
  try {
    await requireUser(false, 'commandes');
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Vérifier que la commande n'est pas déjà livrée
    const commande = await prisma.commandeFournisseur.findUnique({
      where: { id },
    });

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    if (['livree','partielle'].includes(commande.statut)) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une commande déjà livrée' },
        { status: 400 }
      );
    }

    await prisma.commandeFournisseur.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la suppression de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la commande' },
      { status: 500 }
    );
  }
}
