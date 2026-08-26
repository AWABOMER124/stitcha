import { NextResponse } from 'next/server';
import { getAuthContext, requireAnyPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { normalizeProductImage } from '@/services/product-images/product-image-input';
import { storeProductImage } from '@/services/product-images/product-image.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    requireAnyPermission(auth, ['products:create', 'products:update']);
    if (!checkRateLimit(`product-image-upload:${auth.merchantId}:${getClientIp(request)}`, 30, 60 * 60_000)) {
      return NextResponse.json({ error: 'Image upload limit exceeded' }, { status: 429 });
    }
    const file = (await request.formData()).get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    const image = await normalizeProductImage(file);
    const url = await storeProductImage(auth.merchantId, image);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed' }, { status: 400 });
  }
}
