import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { actorName } from '@/lib/stock-ledger';
import { previewZReport, closeZReport } from '@/lib/reports';

// Z-rapport (exigence 2.9 / 4.1).
// GET  : aperçu de la période en cours depuis le dernier Z (ne clôture rien).
// POST : clôture la période, enregistre le Z séquentiel et renvoie le rapport figé.
export async function GET() {
  try {
    await requireUser(false, 'rapports');
    return NextResponse.json(await previewZReport());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  try {
    const user = await requireUser(false, 'rapports');
    return NextResponse.json(await closeZReport(actorName(user)));
  } catch (error) {
    return apiError(error);
  }
}
