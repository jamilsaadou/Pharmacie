import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Paramètres par défaut
const DEFAULT_PARAMS: Record<string, { valeur: string; description: string; categorie: string }> = {
  'app.nom': {
    valeur: 'PharmaCare',
    description: 'Nom de l\'application affiché dans la barre latérale',
    categorie: 'general',
  },
  'app.slogan': {
    valeur: 'Gestion Pharmaceutique',
    description: 'Slogan ou description courte de l\'application',
    categorie: 'general',
  },
  'facturation.prefixe': {
    valeur: 'FAC',
    description: 'Préfixe des numéros de facture',
    categorie: 'facturation',
  },
  'facturation.timbre.seuil': {
    valeur: '5000',
    description: 'Seuil (TTC) à partir duquel appliquer le timbre',
    categorie: 'facturation',
  },
  'facturation.timbre.montant': {
    valeur: '0',
    description: 'Montant du timbre appliqué sur la facture',
    categorie: 'facturation',
  },
  'impression.entete': {
    valeur: '',
    description: 'En-tête personnalisé pour les impressions',
    categorie: 'impression',
  },
  'impression.piedDePage': {
    valeur: '',
    description: 'Pied de page personnalisé pour les impressions',
    categorie: 'impression',
  },
};

/**
 * GET /api/parametres
 * Récupère tous les paramètres ou un paramètre spécifique par clé
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const cle = searchParams.get('cle');
    const categorie = searchParams.get('categorie');

    if (cle) {
      // Récupérer un paramètre spécifique
      let param = await prisma.parametres.findUnique({
        where: { cle },
      });

      // Si le paramètre n'existe pas, retourner la valeur par défaut
      if (!param && DEFAULT_PARAMS[cle]) {
        return NextResponse.json({
          cle,
          ...DEFAULT_PARAMS[cle],
          isDefault: true,
        });
      }

      if (!param) {
        return NextResponse.json({ error: 'Paramètre non trouvé' }, { status: 404 });
      }

      return NextResponse.json(param);
    }

    // Récupérer tous les paramètres
    const where = categorie ? { categorie } : {};
    const parametres = await prisma.parametres.findMany({
      where,
      orderBy: [{ categorie: 'asc' }, { cle: 'asc' }],
    });

    // Fusionner avec les valeurs par défaut
    const allParams: Record<string, any> = {};

    // D'abord, ajouter les valeurs par défaut
    for (const [key, value] of Object.entries(DEFAULT_PARAMS)) {
      if (!categorie || value.categorie === categorie) {
        allParams[key] = {
          cle: key,
          ...value,
          isDefault: true,
        };
      }
    }

    // Ensuite, remplacer par les valeurs de la base de données
    for (const param of parametres) {
      allParams[param.cle] = {
        ...param,
        isDefault: false,
      };
    }

    return NextResponse.json(Object.values(allParams));
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur GET /api/parametres:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parametres
 * Crée ou met à jour un paramètre
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser(true);
    const body = await request.json();
    const { cle, valeur, description, categorie } = body;

    if (!cle || valeur === undefined) {
      return NextResponse.json(
        { error: 'La clé et la valeur sont obligatoires' },
        { status: 400 }
      );
    }

    // Upsert: créer ou mettre à jour
    const param = await prisma.parametres.upsert({
      where: { cle },
      update: {
        valeur,
        description: description || undefined,
        categorie: categorie || 'general',
      },
      create: {
        cle,
        valeur,
        description: description || DEFAULT_PARAMS[cle]?.description || '',
        categorie: categorie || DEFAULT_PARAMS[cle]?.categorie || 'general',
      },
    });

    return NextResponse.json(param);
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur POST /api/parametres:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la sauvegarde du paramètre' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/parametres
 * Met à jour plusieurs paramètres en une fois
 */
export async function PUT(request: NextRequest) {
  try {
    await requireUser(true);
    const body = await request.json();
    const { parametres } = body;

    if (!Array.isArray(parametres)) {
      return NextResponse.json(
        { error: 'Un tableau de paramètres est attendu' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      parametres.map((param: { cle: string; valeur: string; description?: string; categorie?: string }) =>
        prisma.parametres.upsert({
          where: { cle: param.cle },
          update: {
            valeur: param.valeur,
            description: param.description,
            categorie: param.categorie,
          },
          create: {
            cle: param.cle,
            valeur: param.valeur,
            description: param.description || DEFAULT_PARAMS[param.cle]?.description || '',
            categorie: param.categorie || DEFAULT_PARAMS[param.cle]?.categorie || 'general',
          },
        })
      )
    );

    return NextResponse.json({ success: true, parametres: results });
  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur PUT /api/parametres:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}
