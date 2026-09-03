import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { getPendingDirectRegistration } from '@/modules/phone-verification/direct-registration';
import { verifyOtp } from '@/modules/phone-verification/services/phone-verification.service';
import { activateMerchantReferral } from '@/modules/merchant-referrals/merchant-referrals.service';

const schema = z.object({
  verificationToken: z.string().min(32).max(200),
  code: z.string().regex(/^\d{6}$/, 'الرمز مكوّن من 6 أرقام'),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'بيانات التحقق غير صالحة' }, { status: 400 });

  const tokenKey = crypto.createHash('sha256').update(parsed.data.verificationToken).digest('hex').slice(0, 20);
  if (!checkRateLimit(`phone-otp-verify-ip:${getClientIp(req)}`, 30, 15 * 60_000)
    || !checkRateLimit(`phone-otp-verify-token:${tokenKey}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: 'محاولات كثيرة — اطلب رمزاً جديداً لاحقاً' }, { status: 429 });
  }

  try {
    const { merchant, owner } = await getPendingDirectRegistration(parsed.data.verificationToken);
    await verifyOtp(owner.id, parsed.data.code);
    await prisma.$transaction(async tx => {
      await tx.merchant.update({
        where: { id: merchant.id },
        data: { status: 'ACTIVE', registrationToken: null, registrationTokenExpiresAt: null },
      });
      await activateMerchantReferral(merchant.id, tx);
    });
    return NextResponse.json({ verified: true, email: owner.email, slug: merchant.slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'فشل تأكيد الرقم' }, { status: 400 });
  }
}
