import { createHash, randomBytes } from 'node:crypto';
import type { Utilisateur } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const TOKEN_SECONDS = 8 * 3600;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function bearerToken(headers: Headers) {
  const match = /^Bearer (pm_[A-Za-z0-9_-]{43})$/.exec(headers.get('authorization') || '');
  if (!match) throw Error('SESSION_REQUIRED');
  return match[1];
}
export async function authenticateMobile(headers: Headers) {
  const session = await prisma.sessionMobile.findUnique({
    where: { tokenHash: digest(bearerToken(headers)) }, include: { utilisateur: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.utilisateur.actif ||
      session.credentialHash !== digest(session.utilisateur.motDePasse)) throw Error('SESSION_REQUIRED');
  return session;
}
export async function createMobileSession(user: Utilisateur, appareil: string) {
  const accessToken = 'pm_' + randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_SECONDS * 1000);
  await prisma.sessionMobile.create({ data: { utilisateurId: user.id, appareil,
    tokenHash: digest(accessToken), credentialHash: digest(user.motDePasse), expiresAt } });
  return { accessToken, tokenType: 'Bearer', expiresIn: TOKEN_SECONDS, expiresAt };
}
export function publicUser(user: Utilisateur) {
  const parse = (s: string | null) => { try { return s === null ? null : JSON.parse(s); } catch { return []; } };
  return { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role,
    modulesSupplementaires: parse(user.modulesSupplementaires), ventesAccess: parse(user.ventesAccess) };
}
