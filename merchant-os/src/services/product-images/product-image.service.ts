import sharp from 'sharp';
import { BusinessRuleError } from '@/lib/errors';
import { storageService } from '@/services/storage';
import { AiCoreProductImageProvider, isAiCoreImageEnhancementConfigured } from './providers/ai-core-product-image.provider';
import type { NormalizedProductImage } from './product-image-input';
import type { ProductImageEnhancement } from './product-image.schemas';

export async function storeProductImage(merchantId: string, image: NormalizedProductImage): Promise<string> {
  const stored = await storageService.upload(image.buffer, image.filename, image.mimeType, `${merchantId}-products`);
  return storageService.getUrl(stored);
}

export async function enhanceAndStoreProductImage(
  merchantId: string,
  actorId: string,
  image: NormalizedProductImage,
  options: ProductImageEnhancement,
): Promise<string> {
  if (!isAiCoreImageEnhancementConfigured()) {
    throw new BusinessRuleError('AI image enhancement is not enabled');
  }
  const enhanced = await new AiCoreProductImageProvider().enhance(image.buffer, options, { merchantId, actorId });
  try {
    const metadata = await sharp(enhanced.buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.width || !metadata.height) throw new Error('missing dimensions');
  } catch {
    throw new BusinessRuleError('AI image enhancement returned an invalid image');
  }
  const stored = await storageService.upload(
    enhanced.buffer,
    enhanced.filename,
    enhanced.mimeType,
    `${merchantId}-products-ai`,
  );
  return storageService.getUrl(stored);
}
