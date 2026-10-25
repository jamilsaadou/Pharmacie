import { NextResponse } from 'next/server';
export function apiError(error: unknown) {
  const raw = error instanceof Error ? error.message : 'Erreur inattendue';
  const databaseError=error instanceof Error&&error.name.startsWith('Prisma');
  const message=databaseError?'Opération impossible. Vérifiez les données et leurs liens avec l’historique.':raw;
  const status = message === 'SESSION_REQUIRED' ? 401 : message === 'ADMIN_REQUIRED' ? 403 : 400;
  return NextResponse.json({ error: message === 'SESSION_REQUIRED' ? 'Connectez-vous pour accéder à ce service.' : message === 'ADMIN_REQUIRED' ? 'Vous ne disposez pas des droits nécessaires pour cette opération.' : message }, { status });
}
