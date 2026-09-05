import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { normalizeProductImage } from './product-image-input';

async function imageFile(width: number, height: number) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: '#13c4a3' },
  }).png().toBuffer();
  return new File([buffer], 'image.png', { type: 'image/png' });
}

describe('uploaded image dimensions', () => {
  it.each([
    ['product' as const, 900, 1200, 1200, 1200],
    ['logo' as const, 500, 700, 800, 800],
    ['banner' as const, 1400, 500, 1600, 600],
  ])('normalizes %s images to their display canvas without cropping', async (profile, width, height, expectedWidth, expectedHeight) => {
    const normalized = await normalizeProductImage(await imageFile(width, height), profile);
    const metadata = await sharp(normalized.buffer).metadata();
    expect({ width: metadata.width, height: metadata.height }).toEqual({ width: expectedWidth, height: expectedHeight });
  });

  it.each([
    ['product' as const, 599, 600],
    ['logo' as const, 399, 400],
    ['banner' as const, 1199, 450],
  ])('rejects undersized %s images', async (profile, width, height) => {
    await expect(normalizeProductImage(await imageFile(width, height), profile)).rejects.toThrow('dimensions are too small');
  });
});
