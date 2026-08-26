import { createHash } from 'node:crypto';
import { ValidationError } from '@/lib/errors';

const MAX_BYTES = 10 * 1024 * 1024;

export interface PrivateEvidence {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  filename: string;
  sha256: string;
}

export async function normalizePrivateEvidence(file: File): Promise<PrivateEvidence> {
  if (file.size === 0 || file.size > MAX_BYTES) throw new ValidationError('Receipt must be between 1 byte and 10MB');
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMime(buffer);
  if (!mimeType) throw new ValidationError('Receipt must be a valid JPEG, PNG, WebP, or PDF');
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  return { buffer, mimeType, filename: `receipt.${extension}`, sha256: createHash('sha256').update(buffer).digest('hex') };
}

function sniffMime(buffer: Buffer): PrivateEvidence['mimeType'] | null {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}
