import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { BusinessRuleError } from '@/lib/errors';
import type { ProductImageEnhancement } from '../product-image.schemas';

export type EnhancedImage = { buffer: Buffer; mimeType: 'image/png' | 'image/webp'; filename: string; model?: string };

export function isAiCoreImageEnhancementConfigured() {
  return Boolean(process.env.AI_CORE_BASE_URL && process.env.AI_CORE_SECRET_WASLA && process.env.AI_IMAGE_ENHANCEMENT_ENABLED === 'true');
}

export class AiCoreProductImageProvider {
  async enhance(image: Buffer, options: ProductImageEnhancement, context: { merchantId: string; actorId: string }): Promise<EnhancedImage> {
    const baseUrl = process.env.AI_CORE_BASE_URL?.trim().replace(/\/$/, '');
    const secret = process.env.AI_CORE_SECRET_WASLA?.trim();
    if (!baseUrl || !secret) throw new BusinessRuleError('بوابة الذكاء الاصطناعي الخاصة بوصلة غير مُعدة بعد');
    const requestId = randomUUID();
    const token = await new SignJWT({ org: context.merchantId, permissions: ['images.enhance'], language: 'ar' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuer('wasla').setAudience('ai-core').setSubject(context.actorId).setIssuedAt().setExpirationTime('5m').setJti(requestId).sign(new TextEncoder().encode(secret));
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(image)], { type: 'image/webp' }), 'product.webp');
    form.append('mode', options.mode);
    form.append('scene', options.scene ?? '');
    const response = await fetch(`${baseUrl}/api/v1/wasla/images/enhance`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(Number(process.env.AI_CORE_TIMEOUT_MS ?? 120_000)) });
    const body = await response.json().catch(() => null) as { image_base64?: string; mime_type?: string; filename?: string; model?: string; error?: { message?: string } } | null;
    if (!response.ok || !body?.image_base64) throw new BusinessRuleError(body?.error?.message || 'تعذر تحسين الصورة عبر بوابة وصلة للذكاء الاصطناعي');
    if (body.mime_type !== 'image/png' && body.mime_type !== 'image/webp') throw new BusinessRuleError('بوابة الذكاء الاصطناعي أعادت نوع صورة غير صالح');
    return { buffer: Buffer.from(body.image_base64, 'base64'), mimeType: body.mime_type, filename: body.filename || (body.mime_type === 'image/png' ? 'product-transparent.png' : 'product-enhanced.webp'), model: body.model };
  }
}
