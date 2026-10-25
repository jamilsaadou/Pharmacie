import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Tester la connexion à la base de données
export async function GET() {
  try {
    await requireUser(true);
    // Tester la connexion en comptant les médicaments
    const medicamentCount = await prisma.medicament.count();
    const clientCount = await prisma.client.count();
    
    return NextResponse.json({
      status: 'success',
      message: 'Connexion à la base de données réussie',
      database: 'PostgreSQL',
      counts: {
        medicaments: medicamentCount,
        clients: clientCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur de connexion à la base de données:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Erreur de connexion à la base de données',
        error: 'Diagnostic réservé à l’administrateur ; consultez le journal serveur.'
      },
      { status: 500 }
    );
  }
}
