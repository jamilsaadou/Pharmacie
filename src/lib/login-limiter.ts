import { createHash } from 'node:crypto';
const windows = new Map<string, { count: number; reset: number }>();
const WINDOW = 15 * 60 * 1000;
/** Single-instance limiter: bounds attempts before password hashing and never stores cleartext emails. */
export function takeLoginAttempt(email: string, now = Date.now()) {
  for (const [key, value] of windows) if (value.reset <= now) windows.delete(key);
  const key = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const value = windows.get(key);
  if (value && value.count >= 8) return false;
  if (!value && windows.size >= 10000) return false;
  windows.set(key, { count: (value?.count || 0) + 1, reset: value?.reset || now + WINDOW });
  return true;
}
export function clearLoginAttempts(email: string) {
  windows.delete(createHash('sha256').update(email.trim().toLowerCase()).digest('hex'));
}
