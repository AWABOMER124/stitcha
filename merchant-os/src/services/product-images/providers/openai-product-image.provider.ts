import { BusinessRuleError } from '@/lib/errors';
import type { ProductImageEnhancement } from '../product-image.schemas';

interface OpenAiImageResponse {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
}

export interface EnhancedImage {
  buffer: Buffer;
  mimeType: 'image/png' | 'image/webp';
  filename: string;
}

export class OpenAiProductImageProvider {
  async enhance(image: Buffer, options: ProductImageEnhancement): Promise<EnhancedImage> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new BusinessRuleError('AI image enhancement is not configured');

    const transparent = options.mode === 'TRANSPARENT';
    const form = new FormData();
    form.append('model', process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2');
    form.append('image[]', new Blob([new Uint8Array(image)], { type: 'image/webp' }), 'product.webp');
    form.append('prompt', buildProductImagePrompt(options));
    form.append('size', '1024x1024');
    form.append('quality', 'medium');
    form.append('background', transparent ? 'transparent' : 'opaque');
    form.append('output_format', transparent ? 'png' : 'webp');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await response.json().catch(() => ({})) as OpenAiImageResponse;
    if (!response.ok) {
      console.error('[product-image-ai] Provider request failed', response.status, payload.error?.message ?? 'unknown');
      throw new BusinessRuleError('AI image enhancement failed. Try again later.');
    }

    const encoded = payload.data?.[0]?.b64_json;
    if (!encoded) throw new BusinessRuleError('AI image enhancement returned no image');
    const mimeType = transparent ? 'image/png' as const : 'image/webp' as const;
    return {
      buffer: Buffer.from(encoded, 'base64'),
      mimeType,
      filename: transparent ? 'product-transparent.png' : 'product-enhanced.webp',
    };
  }
}

export function buildProductImagePrompt(options: ProductImageEnhancement): string {
  const immutableProduct = 'Preserve the exact product identity, shape, proportions, colors, materials, labels, logos, packaging, and all readable text. Do not invent, remove, distort, recolor, or redesign any part of the product.';
  if (options.mode === 'TRANSPARENT') {
    return `${immutableProduct} Precisely isolate the product, remove only the existing background, refine edges and natural contact shadows, and return a transparent background. Center the full product with comfortable margins.`;
  }
  if (options.mode === 'CLEAN_WHITE') {
    return `${immutableProduct} Create a clean premium ecommerce studio photo on a seamless pure white background. Improve exposure, sharpness, color balance, edge quality, and add only a subtle realistic contact shadow. Center the full product with comfortable margins. No props, badges, text, watermark, border, or gradient.`;
  }
  const scene = options.scene || 'a tasteful premium environment appropriate for this product and its target customer';
  return `${immutableProduct} Place the unchanged product in ${scene}. Produce a photorealistic premium commercial product photograph with coherent scale, perspective, lighting, and natural shadows. Keep the product as the clear hero. Do not add text, badges, watermarks, hands, people, or competing products unless explicitly requested.`;
}
