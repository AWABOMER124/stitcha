import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { BusinessRuleError } from '@/lib/errors';
import { storeContentSchema } from '../store-content.schema';
import type { StoreContentResult } from '../types';

const aiCoreResponseSchema = z.object({
  status: z.literal('ok'),
  request_id: z.string().optional(),
  project_id: z.string().min(1),
  version_id: z.string().min(1),
  version_number: z.number().int().positive(),
  payload: z.unknown(),
  validation_errors: z.array(z.string()).default([]),
});

export interface AiCoreStoreGenerationContext {
  merchantId: string;
  actorId: string;
  merchantName?: string;
  businessType?: string;
  language?: 'ar' | 'en';
  stylePreferences?: Record<string, unknown>;
}

export interface AiCoreStoreGenerationResult {
  content: StoreContentResult;
  requestId?: string;
  projectId: string;
  versionId: string;
  versionNumber: number;
}

export function isAiCoreStoreGenerationConfigured(): boolean {
  return Boolean(process.env.AI_CORE_BASE_URL && process.env.AI_CORE_SECRET_WASLA);
}

export class AiCoreStoreContentProvider {
  async generate(prompt: string, context: AiCoreStoreGenerationContext): Promise<AiCoreStoreGenerationResult> {
    const baseUrl = process.env.AI_CORE_BASE_URL?.trim().replace(/\/$/, '');
    const secret = process.env.AI_CORE_SECRET_WASLA?.trim();
    if (!baseUrl || !secret) throw new BusinessRuleError('AI Core غير مهيأ بالكامل في إعدادات المنصة');

    const requestId = randomUUID();
    const token = await new SignJWT({
      org: context.merchantId,
      permissions: ['wasla.store_projects.create'],
      language: context.language ?? 'ar',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('wasla')
      .setAudience('ai-core')
      .setSubject(context.actorId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .setJti(requestId)
      .sign(new TextEncoder().encode(secret));

    const response = await fetch(`${baseUrl}/api/v1/wasla/projects`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        merchant_description: prompt,
        merchant_name: context.merchantName,
        business_type: context.businessType ?? 'ecommerce',
        style_preferences: context.stylePreferences,
      }),
      signal: AbortSignal.timeout(Number(process.env.AI_CORE_TIMEOUT_MS ?? 60_000)),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body && typeof body === 'object' && 'error' in body
        ? JSON.stringify(body.error).slice(0, 500)
        : `HTTP ${response.status}`;
      throw new BusinessRuleError(`تعذر إنشاء المتجر عبر AI Core: ${message}`);
    }

    const parsed = aiCoreResponseSchema.safeParse(body);
    if (!parsed.success) throw new BusinessRuleError('استجابة AI Core لا تطابق عقد إنشاء المتجر');
    if (parsed.data.validation_errors.length > 0) {
      throw new BusinessRuleError(`AI Core أعاد مسودة غير صالحة: ${parsed.data.validation_errors.join('، ')}`);
    }

    return {
      content: storeContentSchema.parse(parsed.data.payload),
      requestId: parsed.data.request_id,
      projectId: parsed.data.project_id,
      versionId: parsed.data.version_id,
      versionNumber: parsed.data.version_number,
    };
  }
}
