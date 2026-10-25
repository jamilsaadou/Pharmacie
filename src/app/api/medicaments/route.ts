import { assertSupportedInvoice } from '@/lib/invoice-scope';
import {loadCatalogue} from '@/lib/catalogue/server';
import {stockLock,addStockLot} from '@/lib/stock-ledger';
import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Récupérer tous les médicaments
export async function GET() {
  try {
    await requireUser();
    const medicaments = await loadCatalogue();

    return NextResponse.json(medicaments);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des médicaments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des médicaments' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau médicament
export async function POST(request: NextRequest) {
  try {
    const user=await requireUser(false, 'stock');
    const body = await request.json();
    assertSupportedInvoice('FV',[{groupeTaxation:body.groupeTaxation||'B'}]);
    
    if(!Number.isInteger(Number(body.quantiteStock))||Number(body.quantiteStock)<0||!Number.isSafeInteger(Number(body.prix))||Number(body.prix)<0)throw Error("Prix ou quantité invalide.");
    const medicament = await prisma.$transaction(async tx=>{await stockLock(tx);const created=await tx.medicament.create({
      data: {
        nom: body.nom,
        description: body.description,
        prix: parseFloat(body.prix),
        quantiteStock: 0,
        seuilAlerte: parseInt(body.seuilAlerte),
        dateExpiration: new Date(body.dateExpiration),
        categorie: body.categorie,
        fournisseur: body.fournisseur,
        codeBarres: body.codeBarres || null,
        dosage: body.dosage || null,
        forme: body.forme,
        prescription: body.prescription || false,
        photo: body.photo || null,
        groupeTaxation: body.groupeTaxation || 'B', // Défaut: TVA 19%
      }
    });

    if(Number(body.quantiteStock)>0)await addStockLot(tx,{medicamentId:created.id,quantite:Number(body.quantiteStock),dateExpiration:created.dateExpiration,numero:body.numeroLot,statut:body.numeroLot?'disponible':'a_qualifier',provenance:'initial'},user,'Stock initial de la référence');return created;});
    return NextResponse.json(medicament, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la création du médicament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du médicament' },
      { status: 500 }
    );
  }
}
