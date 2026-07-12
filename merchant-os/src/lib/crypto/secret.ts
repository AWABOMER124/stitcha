import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * @module crypto/secret
 * @description AES-256-GCM encryption for tenant secrets stored at rest
 * (e.g. per-merchant WhatsApp Business access tokens). Key is derived via
 * scrypt from SECRETS_ENCRYPTION_KEY — set a long random value in production;
 * this throws rather than falling back to a weak default.
 */

function getKey(): Buffer {
  const passphrase = process.env.SECRETS_ENCRYPTION_KEY;
  if (!passphrase || passphrase.length < 16) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY is not set (or too short) — required to store/read encrypted tenant secrets.'
    );
  }
  return scryptSync(passphrase, 'waslak-secret-salt', 32);
}

/** Encrypt a plaintext secret. Returns `iv:authTag:ciphertext`, all hex. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Decrypt a value produced by encryptSecret. */
export function decryptSecret(stored: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted secret');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Mask a secret for display — keeps last 4 chars visible. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return '••••';
  return `••••${plaintext.slice(-4)}`;
}
