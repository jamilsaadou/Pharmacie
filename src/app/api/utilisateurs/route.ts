import { requireUser } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer tous les utilisateurs
export async function GET() {
  try {
    const currentUser = await requireUser();
    const utilisateurs = await prisma.utilisateur.findMany({
      where: currentUser.role === 'admin' ? undefined : { id: currentUser.id },
      orderBy: {
        dateCreation: 'desc',
      },
    });

    // Transformer les données pour le client
    const utilisateursFormatted = utilisateurs.map(u => {
      const { motDePasse, ...rest } = u;
      return {
        ...rest,
        modulesSupplementaires: u.modulesSupplementaires 
          ? JSON.parse(u.modulesSupplementaires) 
          : [],
        ventesAccess: (u as any).ventesAccess
          ? JSON.parse((u as any).ventesAccess)
          : undefined,
      };
    });

    return NextResponse.json(utilisateursFormatted);
  } catch (error) {
    return apiError(error);
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const actor=await requireUser(true);
    const body = await request.json();
    const {
      nom,
      prenom,
      email,
      motDePasse,
      role,
      actif = true,
      modulesSupplementaires = [],
      ventesAccess,
      currentUserId,
      currentUserName,
    } = body;

    // Validation des champs requis
    if (!nom || !prenom || !email || !motDePasse || !role) {
      return NextResponse.json(
        { error: 'Tous les champs requis doivent être remplis' },
        { status: 400 }
      );
    }

    if(role!==undefined&&!['admin','pharmacien','vendeur'].includes(role))throw Error('Rôle invalide.');
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.utilisateur.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 409 }
      );
    }

    // Créer l'utilisateur
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        motDePasse: hashPassword(motDePasse),
        role,
        actif,
        modulesSupplementaires: modulesSupplementaires.length > 0 
          ? JSON.stringify(modulesSupplementaires) 
          : null,
        ventesAccess: Array.isArray(ventesAccess)
          ? JSON.stringify(ventesAccess)
          : null,
      },
    });

    // Créer un log
    await prisma.auditLog.create({
      data: {
        module: 'utilisateurs',
        action: 'create',
        userId: actor.id,
        userName: `${actor.prenom} ${actor.nom}`,
        targetType: 'utilisateur',
        targetId: utilisateur.id,
        message: `Création de l'utilisateur ${prenom} ${nom} (${email})`,
        details: JSON.stringify({
          nom,
          prenom,
          email,
          role,
          ventesAccess,
        }),
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    const { motDePasse: _, ...utilisateurSansMotDePasse } = utilisateur;

    return NextResponse.json({
      ...utilisateurSansMotDePasse,
      modulesSupplementaires: modulesSupplementaires,
      ventesAccess,
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}
