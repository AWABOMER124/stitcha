import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { normalizeProductImage } from '@/services/product-images/product-image-input';
import { storageService } from '@/services/storage';
import { resolvePublicOrigin } from '@/lib/public-origin';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const { partnerId } = await requireDeliveryPartner();
  if (request.headers.get('origin') !== resolvePublicOrigin(request.headers)) return Response.json({ error: 'طلب غير مسموح' }, { status: 403 });
  if (!checkRateLimit(`partner-logo:${partnerId}`, 20, 3600000)) return Response.json({ error: 'تجاوزت حد الرفع؛ حاول لاحقاً' }, { status: 429 });
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) return Response.json({ error: 'الحد الأقصى 5 ميجابايت' }, { status: 413 });
  try {
    const file = (await request.formData()).get('image');
    if (!(file instanceof File)) return Response.json({ error: 'اختر صورة' }, { status: 400 });
    const normalized = await normalizeProductImage(file);
    const path = await storageService.upload(normalized.buffer, 'logo.webp', normalized.mimeType, `partner-${partnerId}-logo`);
    const url = storageService.getUrl(path);
    await prisma.deliveryPartner.update({ where: { id: partnerId }, data: { appIcon: url } });
    revalidatePath('/partner/settings');
    revalidatePath('/dashboard/delivery/partners');
    return Response.json({ url }, { status: 201 });
  } catch { return Response.json({ error: 'تعذر رفع الشعار. استخدم PNG أو JPEG أو WebP حتى 5 ميجابايت، وتحقق من التخزين الدائم.' }, { status: 400 }); }
}
