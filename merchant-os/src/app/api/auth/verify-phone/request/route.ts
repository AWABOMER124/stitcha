import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { getPendingDirectRegistration } from '@/modules/phone-verification/direct-registration';
import { sendOtp } from '@/modules/phone-verification/services/phone-verification.service';

const schema = z.object({ verificationToken: z.string().min(32).max(200) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });

  const tokenKey = crypto.createHash('sha256').update(parsed.data.verificationToken).digest('hex').slice(0, 20);
  if (!checkRateLimit(`phone-otp-request-ip:${getClientIp(req)}`, 10, 60 * 60_000)
    || !checkRateLimit(`phone-otp-request-token:${tokenKey}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'طلبات كثيرة — حاول لاحقاً' }, { status: 429 });
  }

  try {
    const { owner } = await getPendingDirectRegistration(parsed.data.verificationToken);
    const result = await sendOtp(owner.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر إرسال الرمز' }, { status: 400 });
  }
}

