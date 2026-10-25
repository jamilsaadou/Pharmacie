import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'pharmacare-session';
export function signSession(userId: string, passwordHash: string) {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32) throw new Error('Configurez SESSION_SECRET (32 caractères minimum).');
  const payload = Buffer.from(JSON.stringify({ userId, credential: createHmac('sha256', key).update(passwordHash).digest('base64url'), expires: Date.now() + 8 * 3600000 })).toString('base64url');
  return payload + '.' + createHmac('sha256', key).update(payload).digest('base64url');
}
export async function requireUser(admin = false, module?: string) {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if(!value||value.length>2048||value.split('.').length!==2)throw new Error('SESSION_REQUIRED');
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !process.env.SESSION_SECRET) throw new Error('SESSION_REQUIRED');
  const expected = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('SESSION_REQUIRED');
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new Error('SESSION_REQUIRED'); }
  if(typeof data.userId!=='string'||data.userId.length>200||!Number.isFinite(data.expires)||typeof data.credential!=='string')throw new Error('SESSION_REQUIRED');
  if (data.expires <= Date.now()) throw new Error('SESSION_REQUIRED');
  const user = await prisma.utilisateur.findUnique({ where: { id: data.userId } });
  if (!user?.actif) throw new Error('SESSION_REQUIRED');
  const credential=createHmac('sha256',process.env.SESSION_SECRET).update(user.motDePasse).digest('base64url');
  if(data.credential!==credential)throw new Error('SESSION_REQUIRED');
  if (admin && user.role !== 'admin') throw new Error('ADMIN_REQUIRED');
  if (module && user.role !== 'admin') {
    const allowed: Record<string, string[]> = { pharmacien: ['caisse','stock','rayons','ventes','clients','commandes','fournisseurs','assurances','remboursements','statistiques','rapports','alertes','logs'], vendeur: ['caisse','ventes','clients','alertes'] };
    let extra: string[] = []; try { extra = JSON.parse(user.modulesSupplementaires || '[]'); } catch {}
    if (![...(allowed[user.role] || []), ...extra].includes(module)) throw new Error('ADMIN_REQUIRED');
  }
  return user;
}
