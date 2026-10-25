import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer les logs avec filtres optionnels
export async function GET(request: NextRequest) {
  try {
    await requireUser(false,'logs');
    const { searchParams } = new URL(request.url);
    
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const q = searchParams.get('q');

    // Construction du filtre
    const where: any = {};

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut);
      }
      if (dateFin) {
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    if (q) {
      where.OR = [
        { message: { contains: q } },
        { userName: { contains: q } },
        { targetType: { contains: q } },
        { targetId: { contains: q } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: 1000, // Limiter à 1000 logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des logs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logs' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau log
export async function POST(request: NextRequest) {
  try {
    const actor=await requireUser();
    const body = await request.json();
    
    const {
      module,
      action,
      userId,
      userName,
      targetType,
      targetId,
      message,
      details,
    } = body;

    // Validation des champs requis
    if (!module || !action || !message) {
      return NextResponse.json(
        { error: 'Les champs module, action et message sont requis' },
        { status: 400 }
      );
    }

    const log = await prisma.auditLog.create({
      data: {
        module,
        action,
        userId: actor.id,
        userName: `${actor.prenom} ${actor.nom}`,
        targetType,
        targetId,
        message: 'Interface : '+String(message).slice(0,2000),
        details:JSON.stringify({source:'interface',donnees:details||null}),
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la création du log:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du log' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer tous les logs (vider le journal)
export async function DELETE() {
  try { await requireUser(true); return NextResponse.json({error:'Le journal est conservé pour la traçabilité et ne peut pas être effacé.'},{status:409}); } catch(error) { return apiError(error); }
}
