import { requireUser } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { apiError } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

// PUT - Modifier un utilisateur
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const actor=await requireUser(true);
    const { id } = await context.params;
    const body = await request.json();
    const {
      nom,
      prenom,
      email,
      motDePasse,
      role,
      actif,
      modulesSupplementaires,
      ventesAccess,
      currentUserId,
      currentUserName,
    } = body;

    if(role!==undefined&&!['admin','pharmacien','vendeur'].includes(role))throw Error('Rôle invalide.');
    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.utilisateur.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.utilisateur.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 409 }
        );
      }
    }

    if(id===actor.id&&(actif===false||role&&role!=='admin'))throw Error('Votre propre accès administrateur doit être conservé.');
    // Préparer les données de mise à jour
    const updateData: any = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    if (motDePasse) updateData.motDePasse = hashPassword(motDePasse);
    if (role !== undefined) updateData.role = role;
    if (actif !== undefined) updateData.actif = actif;
    if (modulesSupplementaires !== undefined) {
      updateData.modulesSupplementaires = modulesSupplementaires.length > 0
        ? JSON.stringify(modulesSupplementaires)
        : null;
    }
    if (ventesAccess !== undefined) {
      updateData.ventesAccess = JSON.stringify(ventesAccess);
    }

    // Mettre à jour l'utilisateur
    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: updateData,
    });

    // Créer un log
    await prisma.auditLog.create({
      data: {
        module: 'utilisateurs',
        action: 'update',
        userId: actor.id,
        userName: `${actor.prenom} ${actor.nom}`,
        targetType: 'utilisateur',
        targetId: id,
        message: `Modification de l'utilisateur ${utilisateur.prenom} ${utilisateur.nom}`,
        details: JSON.stringify({ ...updateData, motDePasse: updateData.motDePasse ? '[modifié]' : undefined }),
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    const { motDePasse: _, ...utilisateurSansMotDePasse } = utilisateur;

    return NextResponse.json({
      ...utilisateurSansMotDePasse,
      modulesSupplementaires: utilisateur.modulesSupplementaires
        ? JSON.parse(utilisateur.modulesSupplementaires)
        : [],
      ventesAccess: (utilisateur as any).ventesAccess
        ? JSON.parse((utilisateur as any).ventesAccess)
        : undefined,
    });
  } catch (error) {
    return apiError(error);
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const actor=await requireUser(true);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('currentUserId');
    const currentUserName = searchParams.get('currentUserName');

    // Vérifier si l'utilisateur existe
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
    });

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if(id===actor.id)throw Error('Votre propre compte doit être conservé pendant la session.');
    // Supprimer l'utilisateur
    await prisma.utilisateur.delete({
      where: { id },
    });

    // Créer un log
    await prisma.auditLog.create({
      data: {
        module: 'utilisateurs',
        action: 'delete',
        userId: actor.id,
        userName: `${actor.prenom} ${actor.nom}`,
        targetType: 'utilisateur',
        targetId: id,
        message: `Suppression de l'utilisateur ${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email})`,
        details: JSON.stringify({
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          email: utilisateur.email,
          role: utilisateur.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error) {
    return apiError(error);
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
}
