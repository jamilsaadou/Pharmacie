import {transferLot,expiryFloor} from '@/lib/stock-ledger';
import {loadCatalogue} from '@/lib/catalogue/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
export async function GET() { try { await requireUser(); const [rayons, medicamentsRayons, transferts, medicaments] = await Promise.all([prisma.rayon.findMany(), prisma.medicamentRayon.findMany(), prisma.transfertRayon.findMany({ orderBy: { date: 'desc' } }), loadCatalogue()]); return NextResponse.json({ rayons, medicamentsRayons, transferts, medicaments }); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(); if (!['admin','pharmacien'].includes(user.role)) throw new Error('ADMIN_REQUIRED');
    const body = await request.json(); const quantity = body.quantiteTransferee;
    if (!Number.isInteger(quantity) || quantity <= 0 || !['stock_vers_rayon','rayon_vers_stock','rayon_vers_rayon'].includes(body.typeTransfert)) throw new Error('Transfert ou quantité invalide.');
    const transfer = await prisma.$transaction(async tx => {
      // Tous les transferts et sorties de vente partagent le même verrou d’inventaire.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
      const med = await tx.medicament.findUnique({ where: { id: body.medicamentId } }); const sourceRayon = await tx.rayon.findUnique({ where: { id: body.rayonId } }); if (!med || !sourceRayon) throw new Error('Médicament ou rayon introuvable.');
      const destinationId=body.typeTransfert==='stock_vers_rayon'?sourceRayon.id:body.typeTransfert==='rayon_vers_rayon'?body.rayonDestinationId:null;
      const sourceId=body.typeTransfert==='stock_vers_rayon'?null:sourceRayon.id;
      if(destinationId===sourceId)throw Error('Choisissez un emplacement différent.');
      const lots=await tx.lotStock.findMany({where:{medicamentId:med.id,rayonId:sourceId,statut:'disponible',dateExpiration:{gte:expiryFloor()},quantite:{gt:0}},orderBy:{dateExpiration:'asc'}});
      if(lots.reduce((sum,l)=>sum+l.quantite,0)<quantity)throw Error('Stock disponible insuffisant dans cet emplacement.');
      let remaining=quantity;for(const lot of lots){if(!remaining)break;const moved=Math.min(remaining,lot.quantite);await transferLot(tx,lot.id,moved,destinationId||null,user,String(body.commentaire||'Transfert entre emplacements'));remaining-=moved;}
      const saved = await tx.transfertRayon.create({ data: { medicamentId: med.id, rayonId: sourceRayon.id, rayonDestinationId: body.typeTransfert === 'rayon_vers_rayon' ? destinationId : null, quantiteTransferee: quantity, typeTransfert: body.typeTransfert, utilisateur: `${user.prenom} ${user.nom}`, commentaire: String(body.commentaire || '') } });
      await tx.auditLog.create({ data: { module: 'rayons', action: 'transfer', userId: user.id, targetId: saved.id, message: `Transfert de ${quantity} unité(s) de ${med.nom}` } }); return saved;
    }); return NextResponse.json(transfer, { status: 201 });
  } catch (error) { return apiError(error); }
}
