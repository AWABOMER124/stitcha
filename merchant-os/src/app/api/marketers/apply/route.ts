import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { ConflictError, ValidationError } from '@/lib/errors';
import { submitMarketerApplication } from '@/modules/marketer-applications/marketer-applications.service';

const schema = z.object({
  type: z.enum(['MERCHANT_ACQUISITION', 'STOREFRONT_PRODUCTS']),
  merchantId: z.string().cuid().optional(),
  name: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(9).max(24),
  email: z.string().trim().email().max(254),
  city: z.string().trim().min(2).max(100),
  channels: z.array(z.enum(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'FIELD_SALES', 'OTHER'])).min(1).max(6),
  experience: z.string().trim().max(1000).optional(),
  audienceSize: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  portfolioUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
  acceptTerms: z.literal(true),
});

export async function POST(request: Request) {
  if (!checkRateLimit(`marketer-apply:${getClientIp(request)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'عدد المحاولات كبير. حاول لاحقاً.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'راجع البيانات المطلوبة ثم حاول مجدداً.' }, { status: 400 });
  try {
    const application = await submitMarketerApplication({
      type: parsed.data.type,
      merchantId: parsed.data.merchantId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      city: parsed.data.city,
      channels: parsed.data.channels,
      experience: parsed.data.experience,
      audienceSize: parsed.data.audienceSize,
      portfolioUrl: parsed.data.portfolioUrl || undefined,
      notes: parsed.data.notes,
    });
    return NextResponse.json({ applicationId: application.id, status: application.status }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('[marketers] application failed', error);
    return NextResponse.json({ error: 'تعذر إرسال الطلب حالياً. حاول مرة أخرى.' }, { status: 500 });
  }
}
