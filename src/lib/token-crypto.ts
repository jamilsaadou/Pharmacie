import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(key = process.env.ENCRYPTION_KEY): Buffer {
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error('ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux (32 octets).');
  }
  return Buffer.from(key, 'hex');
}

export class TokenCrypto {
  static encrypt(token: string, key?: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }
  static decrypt(value: string, key?: string): string {
    const [version, iv, tag, encrypted] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
      throw new Error('Ancien jeton non chiffré : enregistrez un nouveau jeton dans les paramètres.');
    }
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
  }
}
