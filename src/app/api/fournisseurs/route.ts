import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Récupérer tous les fournisseurs
export async function GET() {
  try {
    await requireUser();
    const fournisseurs = await prisma.fournisseur.findMany({
      orderBy: {
        dateAjout: 'desc',
      },
    });

    return NextResponse.json(fournisseurs);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fournisseurs' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
  try {
    await requireUser(false, 'fournisseurs');
    const body = await request.json();
    const { nom, contact, telephone, email, adresse } = body;

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        contact,
        telephone,
        email,
        adresse,
      },
    });

    return NextResponse.json(fournisseur, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la création du fournisseur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du fournisseur' },
      { status: 500 }
    );
  }
}
