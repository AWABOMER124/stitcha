import { NextResponse } from 'next/server';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { normalizeProductImage } from '@/services/product-images/product-image-input';
import { storageService } from '@/services/storage';

export const runtime = 'nodejs';

const ASSET_TYPES = new Set(['logo', 'banner']);

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'settings:update');
    if (!checkRateLimit(`storefront-asset-upload:${auth.merchantId}:${getClientIp(request)}`, 40, 60 * 60_000)) {
      return NextResponse.json({ error: 'Image upload limit exceeded' }, { status: 429 });
    }

    const form = await request.formData();
    const file = form.get('image');
    const assetType = String(form.get('assetType') ?? '');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }
    if (!ASSET_TYPES.has(assetType)) {
      return NextResponse.json({ error: 'Invalid storefront asset type' }, { status: 400 });
    }

    const image = await normalizeProductImage(file);
    const stored = await storageService.upload(
      image.buffer,
      `${assetType}.webp`,
      image.mimeType,
      `${auth.merchantId}-storefront-${assetType}`,
    );

    return NextResponse.json({ url: storageService.getUrl(stored) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed' },
      { status: 400 },
    );
  }
}
