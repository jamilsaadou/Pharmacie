import { takeLoginAttempt, clearLoginAttempts } from '@/lib/login-limiter';
import { verifyPassword } from '@/lib/password';
import { signSession, SESSION_COOKIE } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, motDePasse } = await request.json();

    if(typeof email!=='string'||typeof motDePasse!=='string'||email.length>254||motDePasse.length>1024) return NextResponse.json({error:'Identifiants invalides.'},{status:400});
    if(!takeLoginAttempt(email))return NextResponse.json({error:'Trop de tentatives. Réessayez dans quinze minutes.'},{status:429,headers:{'Retry-After':'900'}});
    // Validation des champs requis
    if (!email || !motDePasse) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Rechercher l'utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe (en production, utiliser bcrypt)
    if (!verifyPassword(motDePasse, utilisateur.motDePasse)) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier si l'utilisateur est actif
    if (!utilisateur.actif) {
      return NextResponse.json(
        { error: 'Compte désactivé' },
        { status: 403 }
      );
    }

    clearLoginAttempts(email);
    // Créer un log de connexion
    await prisma.auditLog.create({
      data: {
        module: 'system',
        action: 'login',
        userId: utilisateur.id,
        userName: `${utilisateur.prenom} ${utilisateur.nom}`,
        message: `Connexion réussie pour ${utilisateur.email}`,
        details: JSON.stringify({
          email: utilisateur.email,
          role: utilisateur.role,
        }),
      },
    });

    // Retourner les données de l'utilisateur (sans le mot de passe)
    const { motDePasse: _, ...utilisateurSansMotDePasse } = utilisateur;

    const response = NextResponse.json({
      success: true,
      utilisateur: {
        ...utilisateurSansMotDePasse,
        modulesSupplementaires: utilisateur.modulesSupplementaires 
          ? JSON.parse(utilisateur.modulesSupplementaires) 
          : [],
        ventesAccess: (utilisateur as any).ventesAccess
          ? JSON.parse((utilisateur as any).ventesAccess)
          : undefined,
      },
    });
    response.cookies.set(SESSION_COOKIE, signSession(utilisateur.id, utilisateur.motDePasse), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 3600 });
    return response;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
