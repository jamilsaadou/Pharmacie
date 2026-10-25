import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TokenCrypto } from '@/lib/token-crypto';
import { requireUser } from '@/lib/session';
import { apiError } from '@/lib/api-error';

const issuerKeys = ['raisonSociale', 'rccm', 'telephone', 'email', 'boitePostale'] as const;
async function issuerSettings() { const rows = await prisma.parametres.findMany({ where: { cle: { startsWith: 'entreprise.' } } }); return Object.fromEntries(issuerKeys.map(key => [key, rows.find(r => r.cle === `entreprise.${key}`)?.valeur || ''])); }
function publicConfiguration(config: Record<string, unknown>) {
  const { token, ...safe } = config;
  const expiry = config.tokenValidUntil ? new Date(String(config.tokenValidUntil)).getTime() : null;
  return { ...safe, tokenMasked: token ? '••••••••••••••••' : '', tokenStatus: !expiry ? 'unknown' : expiry <= Date.now() ? 'expired' : expiry - Date.now() <= 7 * 86400000 ? 'expiring_soon' : 'valid' };
}
export async function GET() {
  try {
    await requireUser();
    const config = await prisma.configurationESECeF.findFirst({ where: { actif: true } });
    return config ? NextResponse.json({ ...publicConfiguration(config), ...await issuerSettings() }) : NextResponse.json({ error: 'Configuration à créer' }, { status: 404 });
  } catch (error) { return apiError(error); }
}
async function save(request: NextRequest) {
  try {
    const user = await requireUser(true);
    const body = await request.json();
    const nif = typeof body.nif === 'string' ? body.nif.trim() : '';
    const nim = typeof body.nim === 'string' ? body.nim.trim() : '';
    const isf = typeof body.isf === 'string' ? body.isf.trim() : '';
    if (!/^\d{1,30}$/.test(nif) || !/^[A-Z0-9-]{5,40}$/i.test(nim) || !isf || isf.length > 100) throw new Error('Renseignez un NIF numérique, un NIM valide et votre identifiant ISF.');
    if (!['test', 'production'].includes(body.environnement)) throw new Error('Environnement invalide.');
    if (!['TTC', 'HT'].includes(body.modePrix || 'TTC')) throw new Error('Mode de prix invalide.');
    const timeout = Number(body.delaiAttenteMs ?? 30000);
    if (!Number.isInteger(timeout) || timeout < 5000 || timeout > 60000) throw new Error('Le délai doit être compris entre 5 et 60 secondes.');
    const config = await prisma.$transaction(async tx => {
      // Sérialiser les changements de configuration active, y compris les créations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742019)`;
      const existing = body.id ? await tx.configurationESECeF.findUnique({ where: { id: body.id } }) : null;
      if (body.id && !existing) throw new Error('Configuration introuvable.');
      const identityChanged = existing && (existing.nif !== nif || existing.nim !== nim || existing.environnement !== body.environnement);
      if (identityChanged && (await tx.factureESECeF.count({ where: { configurationId: existing.id } }) || await tx.demandeCertification.count({ where: { configurationId: existing.id } }))) throw new Error('Ce compteur a un historique. Ajoutez une nouvelle configuration pour conserver son identité.');
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if ((!existing || identityChanged) && !token) throw new Error('Un nouveau jeton est requis pour ce compteur et cet environnement.');
      if (token && (token.length < 20 || token.length > 16000)) throw new Error('Le jeton fourni est invalide.');
      if (identityChanged && (await tx.demandeCertification.count({ where: { configurationId: existing.id, statut: { in: ['soumise', 'confirmation_en_cours'] } } }) || await tx.factureESECeF.count({ where: { configurationId: existing.id, statut: { in: ['soumise', 'confirmation_en_cours'] } } }))) throw new Error('Finalisez les demandes en attente avant de changer de compteur.');
      await tx.configurationESECeF.updateMany({ where: { actif: true }, data: { actif: false } });
      const data = { nif, nim, isf, environnement: body.environnement, modePrix: body.modePrix || 'TTC', delaiAttenteMs: timeout, nomEtablissement: String(body.nomEtablissement || '').slice(0, 160), adresse: String(body.adresse || '').slice(0, 500), actif: true, ...(token ? { token: TokenCrypto.encrypt(token), tokenValidUntil: null, lastTokenCheck: null } : {}), ...(identityChanged ? { catalogueFiscal: Prisma.DbNull, derniereSynchro: null, derniersCompteurs: null } : {}) };
      const saved = existing ? await tx.configurationESECeF.update({ where: { id: existing.id }, data }) : await tx.configurationESECeF.create({ data: { ...data, token: TokenCrypto.encrypt(token) } });
      for (const key of issuerKeys) if (typeof body[key] === 'string') { const value = body[key].trim().slice(0,500); await tx.parametres.upsert({ where: { cle: `entreprise.${key}` }, create: { cle: `entreprise.${key}`, valeur: value, categorie: 'general' }, update: { valeur: value } }); }
      await tx.auditLog.create({ data: { module: 'esecef', action: existing ? 'update' : 'create', userId: user.id, message: `Configuration e-MCF ${body.environnement} : ${nim}`, targetId: saved.id } });
      return saved;
    });
    return NextResponse.json({ ...publicConfiguration(config), ...await issuerSettings() }, { status: body.id ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
export const POST = save;
export const PUT = save;
