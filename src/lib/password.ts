import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashPassword(password: string) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Le mot de passe doit contenir au moins 12 caractères.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [method, salt, key] = stored.split(':');
  if (method !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'hex'); const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
