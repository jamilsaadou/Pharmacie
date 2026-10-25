import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { summarizeClientGroups } from '@/lib/client-history';
import { prisma } from '@/lib/prisma';

// GET - Récupérer tous les clients
export async function GET() {
  try {
    await requireUser();
    const clients = await prisma.client.findMany({
      orderBy: {
        dateInscription: 'desc'
      }
    });

    const groups=await prisma.vente.groupBy({by:['clientId','typeFacture'],where:{clientId:{not:null},statut:'terminee',factureESECeF:{statut:'certifiee'}},_sum:{total:true},_count:{_all:true},_max:{date:true}});
    return NextResponse.json(clients.map(client=>{const summary=summarizeClientGroups(groups.filter(g=>g.clientId===client.id));return {...client,totalAchatsNet:summary.netAmount,nombreAchats:summary.purchases,dernierAchat:summary.lastPurchase};}));
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des clients:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clients' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau client
export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const body = await request.json();
    
    const client = await prisma.client.create({
      data: {
        nom: body.nom,
        prenom: body.prenom,
        nif: body.nif || null,
        telephone: body.telephone || null,
        email: body.email || null,
        adresse: body.adresse || null,
        dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : null,
        numeroSecu: body.numeroSecu || null,
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la création du client:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du client' },
      { status: 500 }
    );
  }
}
