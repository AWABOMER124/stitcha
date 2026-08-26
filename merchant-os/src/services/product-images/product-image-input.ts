import sharp, { type Metadata } from 'sharp';
import { ValidationError } from '@/lib/errors';

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface NormalizedProductImage {
  buffer: Buffer;
  mimeType: 'image/webp';
  filename: string;
}

export async function normalizeProductImage(file: File): Promise<NormalizedProductImage> {
  if (!ALLOWED_TYPES.has(file.type)) throw new ValidationError('Use a JPEG, PNG, or WebP image');
  if (file.size === 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ValidationError('Product image must be between 1 byte and 5MB');
  }

  const input = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ValidationError('The uploaded file is not a valid image');
  }
  if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
    throw new ValidationError('The uploaded file is not a supported product image');
  }

  const buffer = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 95 })
    .toBuffer();

  return { buffer, mimeType: 'image/webp', filename: 'product.webp' };
}
