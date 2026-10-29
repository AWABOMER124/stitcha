import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { requestRegistrationCode } from '@/modules/account-verification/registration-verification.service';

const schema = z.object({
  verificationToken: z.string().min(32).max(200).optional(),
  userId: z.string().cuid().optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP']).default('EMAIL'),
}).refine(value => !!value.verificationToken !== !!value.userId, 'Provide exactly one account reference');

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  const reference = parsed.data.verificationToken ?? parsed.data.userId!;
  const key = crypto.createHash('sha256').update(reference).digest('hex').slice(0, 20);
  if (!checkRateLimit(`account-code-request-ip:${getClientIp(request)}`, 12, 60 * 60_000)
    || !checkRateLimit(`account-code-request-ref:${key}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'طلبات كثيرة؛ حاول لاحقاً' }, { status: 429 });
  }
  try {
    const result = await requestRegistrationCode(parsed.data, parsed.data.channel);
    return NextResponse.json({ sent: true, ...result, expiresInMinutes: result.alreadyVerified ? 0 : 10 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر إرسال الرمز' }, { status: 400 });
  }
}
