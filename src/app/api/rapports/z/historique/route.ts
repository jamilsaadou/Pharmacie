import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { listZReports } from '@/lib/reports';

// Historique des clôtures Z.
export async function GET() {
  try {
    await requireUser(false, 'rapports');
    return NextResponse.json(await listZReports());
  } catch (error) {
    return apiError(error);
  }
}
