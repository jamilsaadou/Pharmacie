import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';
import { randomUUID } from 'node:crypto';
const definitions = {
  assurances: { model: 'assurance', fields: ['nom','code','tauxCouverture','telephone','email','adresse'], dates: [] },
  assures: { model: 'assure', fields: ['clientId','assuranceId','numeroPolice','tauxCouverture','dateDebut','dateFin','actif'], dates: ['dateDebut','dateFin'] },
  dossiers: { model: 'dossierRemboursement', fields: ['assuranceId','assureId','venteId','dateSoumission','periodeDebut','periodeFin','montantTotal','montantCouvert','montantPayeClient','montantRembourse','statut','commentaire'], dates: ['dateSoumission','periodeDebut','periodeFin'] },
  rayons: { model: 'rayon', fields: ['nom','description','emplacement','capaciteMax'], dates: [] },
} as const;
type Context = { params: Promise<{ collection: string }> };
async function definition(context: Context) { const { collection } = await context.params; const def = definitions[collection as keyof typeof definitions]; if (!def) throw new Error('Collection inconnue.'); return { def, collection }; }
function validate(collection: string, data: any, creating: boolean) {
  if (collection === 'assurances' && (creating || data.tauxCouverture !== undefined) && (!Number.isFinite(data.tauxCouverture) || data.tauxCouverture < 0 || data.tauxCouverture > 100)) throw new Error('Le taux de couverture doit être compris entre 0 et 100.');
  if (['assurances','rayons'].includes(collection) && (creating || data.nom !== undefined) && !data.nom?.trim()) throw new Error('Le nom est requis.');
  if (collection === 'rayons' && (creating || data.capaciteMax !== undefined) && (!Number.isInteger(data.capaciteMax) || data.capaciteMax <= 0)) throw new Error('Capacité invalide.');
  if (collection === 'assures') { if (creating && (!data.clientId || !data.assuranceId || !data.numeroPolice)) throw new Error('Client, assurance et police sont requis.'); if (data.tauxCouverture != null && (!Number.isFinite(data.tauxCouverture) || data.tauxCouverture < 0 || data.tauxCouverture > 100)) throw new Error('Taux de couverture invalide.'); if (data.dateFin && data.dateDebut && data.dateFin < data.dateDebut) throw new Error('Dates du contrat invalides.'); }
  if (collection === 'dossiers') {
    for (const key of ['montantTotal','montantCouvert','montantPayeClient','montantRembourse']) if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < 0)) throw new Error('Montant invalide.');
    if (data.montantCouvert > data.montantTotal || data.montantRembourse > data.montantCouvert) throw new Error('Les montants couverts ou remboursés dépassent le montant autorisé.');
    if (data.periodeDebut && data.periodeFin && data.periodeDebut > data.periodeFin) throw new Error('Période invalide.');
    if (data.statut && !['en_attente','partiel','rembourse'].includes(data.statut)) throw new Error('Statut invalide.');
    if (data.statut === 'rembourse' && data.montantRembourse !== data.montantCouvert) throw new Error('Un dossier remboursé doit être soldé.');
  }
}
export async function GET(request: NextRequest, context: Context) { try { await requireUser(); const { def } = await definition(context); return NextResponse.json(await (prisma[def.model] as any).findMany()); } catch (error) { return apiError(error); } }
async function mutate(request: NextRequest, context: Context, creating: boolean) {
  try {
    const user = await requireUser(); if (!['admin','pharmacien'].includes(user.role)) throw new Error('ADMIN_REQUIRED');
    const { def, collection } = await definition(context); const body = await request.json(); const source = body.data || body;
    const data: any = {}; for (const field of def.fields) if (source[field] !== undefined) data[field] = source[field];
    for (const field of def.dates) if (data[field] != null) { data[field] = new Date(data[field]); if (!Number.isFinite(data[field].getTime())) throw new Error('Date invalide.'); }
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
      const model = tx[def.model] as any;
      const existing = creating ? null : await model.findUnique({ where: { id: body.id } }); if (!creating && !existing) throw new Error('Enregistrement introuvable.');
      validate(collection, { ...existing, ...data }, creating);
      if (creating && collection === 'dossiers') { data.reference = `REMB-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`; data.montantRembourse ??= 0; data.statut ??= 'en_attente'; }
      if (creating && collection === 'rayons') data.description ??= '';
      if (!creating && collection === 'rayons' && data.capaciteMax !== undefined) { const load = await tx.medicamentRayon.aggregate({ where: { rayonId: body.id }, _sum: { quantiteEnRayon: true } }); if ((load._sum.quantiteEnRayon || 0) > data.capaciteMax) throw new Error('La capacité est inférieure au stock déjà placé dans le rayon.'); }
      const saved = creating ? await model.create({ data }) : await model.update({ where: { id: body.id }, data });
      await tx.auditLog.create({ data: { module: collection === 'rayons' ? 'rayons' : 'assurances', action: creating ? 'create' : 'update', userId: user.id, targetId: saved.id, message: `${creating ? 'Création' : 'Modification'} ${collection}` } }); return saved;
    });
    return NextResponse.json(result, { status: creating ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
export const POST = (r: NextRequest,c: Context) => mutate(r,c,true);
export const PUT = (r: NextRequest,c: Context) => mutate(r,c,false);
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(true); const { def, collection } = await definition(context); const id = request.nextUrl.searchParams.get('id'); if (!id) throw new Error('Identifiant requis.');
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
      if (collection === 'rayons' && (await tx.medicamentRayon.count({ where: { rayonId: id, quantiteEnRayon: { gt: 0 } } }) || await tx.transfertRayon.count({ where: { OR: [{ rayonId: id },{ rayonDestinationId: id }] } }))) throw new Error('Un rayon avec du stock ou un historique ne peut pas être supprimé.');
      if (collection === 'assurances' && (await tx.assure.count({ where: { assuranceId: id } }) || await tx.dossierRemboursement.count({ where: { assuranceId: id } }))) throw new Error('Cette assurance possède des contrats ou dossiers. Conservez son historique.');
      if (collection === 'assures' && await tx.dossierRemboursement.count({ where: { assureId: id } })) throw new Error('Cet assuré possède un historique de remboursement. Désactivez le contrat.');
      await (tx[def.model] as any).delete({ where: { id } });
      await tx.auditLog.create({ data: { module: collection === 'rayons' ? 'rayons' : 'assurances', action: 'delete', userId: user.id, targetId: id, message: `Suppression ${collection}` } });
    }); return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
