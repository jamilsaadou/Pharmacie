import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { apiError } from '@/lib/api-error';
import { assertSameOrigin } from '@/lib/request-origin';
export async function GET() {
  try { return NextResponse.json({ installationRequired: await prisma.utilisateur.count() === 0 }); }
  catch { return NextResponse.json({ error: 'Connexion PostgreSQL indisponible. Vérifiez DATABASE_URL.' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request.headers, request.url);
    const body = await request.json();
    if (!body.nom?.trim() || !body.prenom?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '')) throw new Error('Renseignez votre nom, prénom et une adresse email valide.');
    const password = hashPassword(body.motDePasse);
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742020)`;
      if (await tx.utilisateur.count()) throw new Error('L’installation est déjà terminée. Connectez-vous avec votre compte.');
      await tx.utilisateur.create({ data: { nom: body.nom.trim(), prenom: body.prenom.trim(), email: body.email.trim().toLowerCase(), motDePasse: password, role: 'admin' } });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
