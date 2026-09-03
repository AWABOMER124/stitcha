import { NextResponse } from 'next/server';
import { getAuthContext, requireAnyPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { normalizeProductImage } from '@/services/product-images/product-image-input';
import { productImageEnhancementSchema } from '@/services/product-images/product-image.schemas';
import { enhanceAndStoreProductImage } from '@/services/product-images/product-image.service';
import { requireMerchantEntitlement } from '@/modules/merchant-subscriptions';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    requireAnyPermission(auth, ['products:create', 'products:update']);
    await requireMerchantEntitlement(auth.merchantId, 'aiMonthlyCredits', 'تحسين الصور بالذكاء الاصطناعي متاح في باقة Pro');
    if (!checkRateLimit(`product-image-ai:${auth.merchantId}:${getClientIp(request)}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: 'AI image limit exceeded. Try again later.' }, { status: 429 });
    }
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    const options = productImageEnhancementSchema.parse({ mode: form.get('mode'), scene: form.get('scene') ?? '' });
    const image = await normalizeProductImage(file);
    const url = await enhanceAndStoreProductImage(auth.merchantId, image, options);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI image enhancement failed' }, { status: 400 });
  }
}
