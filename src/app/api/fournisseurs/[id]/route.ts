import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Récupérer un fournisseur par ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(fournisseur);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération du fournisseur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du fournisseur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un fournisseur
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser(false, 'fournisseurs');
    const { id } = await context.params;
    const body = await request.json();
    const { nom, contact, telephone, email, adresse } = body;

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom,
        contact,
        telephone,
        email,
        adresse,
      },
    });

    return NextResponse.json(fournisseur);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la mise à jour du fournisseur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du fournisseur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un fournisseur
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser(false, 'fournisseurs');
    const { id } = await context.params;
    await prisma.fournisseur.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la suppression du fournisseur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fournisseur' },
      { status: 500 }
    );
  }
}
