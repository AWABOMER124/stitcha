import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { loginSchema } from '@/modules/customer-auth/schemas/customer-auth.schemas';
import { login } from '@/modules/customer-auth/services/customer-auth.service';
import { ValidationError } from '@/lib/errors';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 5 attempts / 15 min per IP — brute-force guard on the password check below.
    enforceRateLimit(`customer-login:${getClientIp(req)}`, 5, 15 * 60_000);

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة');

    const result = await login(parsed.data);
    return appData(result);
  } catch (err) {
    return appError(err);
  }
}
