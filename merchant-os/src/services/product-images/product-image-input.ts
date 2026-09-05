import sharp, { type Metadata } from 'sharp';
import { ValidationError } from '@/lib/errors';

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface NormalizedProductImage {
  buffer: Buffer;
  mimeType: 'image/webp';
  filename: string;
}

export type ImageProfile = 'product' | 'logo' | 'banner';

const IMAGE_PROFILES: Record<ImageProfile, { width: number; height: number; minWidth: number; minHeight: number }> = {
  product: { width: 1200, height: 1200, minWidth: 600, minHeight: 600 },
  logo: { width: 800, height: 800, minWidth: 400, minHeight: 400 },
  banner: { width: 1600, height: 600, minWidth: 1200, minHeight: 450 },
};

export async function normalizeProductImage(file: File, profile: ImageProfile = 'product'): Promise<NormalizedProductImage> {
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

  const target = IMAGE_PROFILES[profile];
  if (metadata.width < target.minWidth || metadata.height < target.minHeight) {
    throw new ValidationError(`Image dimensions are too small. Minimum: ${target.minWidth} x ${target.minHeight}px`);
  }

  const buffer = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: target.width,
      height: target.height,
      fit: 'contain',
      background: profile === 'logo'
        ? { r: 255, g: 255, b: 255, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 90, alphaQuality: 95 })
    .toBuffer();

  return { buffer, mimeType: 'image/webp', filename: 'product.webp' };
}
