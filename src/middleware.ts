import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/request-origin';
export function middleware(request: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    try {
      assertSameOrigin(request.headers, request.url);
      if (request.headers.get('sec-fetch-site') === 'cross-site') throw new Error('Origine de la requête invalide.');
    } catch {
      return NextResponse.json({ error: 'Origine de la requête invalide.' }, { status: 403 });
    }
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export const config = { matcher: ['/api/:path*'] };
