import { apiError } from '@/lib/api-error';
import { SESSION_COOKIE, requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const actor=await requireUser();
    const { userId, userName } = await request.json();

    // Validation des champs requis
    if (!userId) {
      return NextResponse.json(
        { error: 'userId requis' },
        { status: 400 }
      );
    }

    // Créer un log de déconnexion
    await prisma.auditLog.create({
      data: {
        module: 'system',
        action: 'logout',
        userId:actor.id,
        userName:`${actor.prenom} ${actor.nom}`,
        message: `Déconnexion de ${userName || 'utilisateur'}`,
        details: JSON.stringify({
          userId:actor.id,
        }),
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
