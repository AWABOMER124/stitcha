import { NextResponse } from 'next/server';
import { getAuthContext, requireAnyPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { normalizeProductImage } from '@/services/product-images/product-image-input';
import { productImageEnhancementSchema } from '@/services/product-images/product-image.schemas';
import { enhanceAndStoreProductImage } from '@/services/product-images/product-image.service';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { AI_FEATURE_KEYS, runMeteredAiOperation } from '@/modules/ai-usage';
import { AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    requireAnyPermission(auth, ['products:create', 'products:update']);
    if (!checkRateLimit(`product-image-ai:${auth.merchantId}:${getClientIp(request)}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: 'AI image limit exceeded. Try again later.' }, { status: 429 });
    }
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    const options = productImageEnhancementSchema.parse({ mode: form.get('mode'), scene: form.get('scene') ?? '' });
    const image = await normalizeProductImage(file);
    const plan = await getMerchantPlanSnapshot(auth.merchantId);
    const url = await runMeteredAiOperation({
      merchantId: auth.merchantId,
      featureKey: AI_FEATURE_KEYS.IMAGE_ENHANCEMENT_MONTHLY,
      period: 'MONTHLY',
      limit: plan.entitlements.aiImageEnhancementsMonthly,
      idempotencyKey: request.headers.get('idempotency-key')?.slice(0, 120) || crypto.randomUUID(),
    }, async () => ({
      value: await enhanceAndStoreProductImage(auth.merchantId, image, options),
      usage: { provider: 'openai', model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2' },
    }));
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code, ...(error.details ?? {}) }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI image enhancement failed' }, { status: 400 });
  }
}
