import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Récupérer un client par ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération du client:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du client' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un client
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body = await request.json();

    const client = await prisma.client.update({
      where: { id },
      data: {
        nom: body.nom,
        prenom: body.prenom,
        nif: body.nif || null,
        telephone: body.telephone || null,
        email: body.email || null,
        adresse: body.adresse || null,
        dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : null,
        numeroSecu: body.numeroSecu || null,
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la mise à jour du client:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du client' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un client
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser();
    const { id } = await context.params;
    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Client supprimé avec succès' });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la suppression du client:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du client' },
      { status: 500 }
    );
  }
}
