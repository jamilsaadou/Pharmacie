import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { generateAReport } from '@/lib/reports';

// A-rapport (exigence 2.10 / 5.1) : détail par article sur une période optionnelle.
export async function GET(request: NextRequest) {
  try {
    await requireUser(false, 'rapports');
    const params = request.nextUrl.searchParams;
    const debut = params.get('debut') ? new Date(params.get('debut')!) : undefined;
    const fin = params.get('fin') ? new Date(params.get('fin')!) : undefined;
    const report = await generateAReport({ debut, fin });
    return NextResponse.json(report);
  } catch (error) {
    return apiError(error);
  }
}
