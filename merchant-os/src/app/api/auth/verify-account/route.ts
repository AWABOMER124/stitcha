import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { completeRegistrationVerification } from '@/modules/account-verification/registration-verification.service';

const schema = z.object({
  verificationToken: z.string().min(32).max(200).optional(),
  userId: z.string().cuid().optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP']).default('EMAIL'),
  code: z.string().regex(/^\d{6}$/),
}).refine(value => !!value.verificationToken !== !!value.userId, 'Provide exactly one account reference');

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'بيانات التحقق غير صالحة' }, { status: 400 });
  const reference = parsed.data.verificationToken ?? parsed.data.userId!;
  const key = crypto.createHash('sha256').update(reference).digest('hex').slice(0, 20);
  if (!checkRateLimit(`account-code-verify-ip:${getClientIp(request)}`, 30, 15 * 60_000)
    || !checkRateLimit(`account-code-verify-ref:${key}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: 'محاولات كثيرة؛ اطلب رمزاً جديداً لاحقاً' }, { status: 429 });
  }
  try {
    return NextResponse.json(await completeRegistrationVerification(parsed.data, parsed.data.channel, parsed.data.code));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'فشل تأكيد الحساب' }, { status: 400 });
  }
}
