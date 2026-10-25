import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { generateXReport } from '@/lib/reports';

// X-rapport (exigence 2.8 / 4.2) : quotidien depuis le dernier Z, ou sur une période choisie.
export async function GET(request: NextRequest) {
  try {
    await requireUser(false, 'rapports');
    const params = request.nextUrl.searchParams;
    const mode = params.get('mode') === 'periode' ? 'periode' : 'quotidien';
    const debut = params.get('debut') ? new Date(params.get('debut')!) : undefined;
    const fin = params.get('fin') ? new Date(params.get('fin')!) : undefined;
    const report = await generateXReport({ mode, debut, fin });
    return NextResponse.json(report);
  } catch (error) {
    return apiError(error);
  }
}
