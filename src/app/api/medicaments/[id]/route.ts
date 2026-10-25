import { assertSupportedInvoice } from '@/lib/invoice-scope';
import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Récupérer un médicament par ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const medicament = await prisma.medicament.findUnique({
      where: { id }
    });

    if (!medicament) {
      return NextResponse.json(
        { error: 'Médicament non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(medicament);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    return apiError(error);
  }
}

// PUT - Mettre à jour un médicament
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser(false, 'stock');
    const { id } = await context.params;
    const body = await request.json();
    assertSupportedInvoice('FV',[{groupeTaxation:body.groupeTaxation||'B'}]);

    for(const field of ['prix','seuilAlerte'])if(body[field]!==undefined&&(!Number.isSafeInteger(Number(body[field]))||Number(body[field])<0))throw Error('Prix et seuil doivent être des entiers positifs ou nuls.');
    const current=await prisma.medicament.findUniqueOrThrow({where:{id}});
    if(body.quantiteStock!==undefined&&Number(body.quantiteStock)!==current.quantiteStock)throw Error('Corrigez les quantités dans Lots et stock → Inventaires pour conserver leur historique.');
    const medicament = await prisma.medicament.update({
      where: { id },
      data: {
        nom: body.nom,
        description: body.description,
        prix: body.prix===undefined?undefined:Number(body.prix),

        seuilAlerte: body.seuilAlerte===undefined?undefined:Number(body.seuilAlerte),

        categorie: body.categorie,
        fournisseur: body.fournisseur,
        codeBarres: body.codeBarres || null,
        dosage: body.dosage || null,
        forme: body.forme,
        prescription: body.prescription || false,
        photo: body.photo || null,
        groupeTaxation: body.groupeTaxation || 'B',
      }
    });

    return NextResponse.json(medicament);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    return apiError(error);
  }
}

// DELETE - Supprimer un médicament
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireUser(false, 'stock');
    const { id } = await context.params;
    if(await prisma.lotStock.count({where:{medicamentId:id}})||await prisma.itemVente.count({where:{medicamentId:id}}))throw Error('Une référence avec des lots ou un historique doit être conservée.');
    await prisma.medicament.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Médicament supprimé avec succès' });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    return apiError(error);
  }
}
