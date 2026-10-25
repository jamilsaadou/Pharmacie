import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ error: 'Créez votre premier administrateur depuis l’écran de connexion. Les comptes prédéfinis sont désactivés.' }, { status: 410 }); }
export const GET = POST;
