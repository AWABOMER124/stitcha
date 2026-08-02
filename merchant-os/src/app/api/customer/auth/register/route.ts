import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { registerSchema } from '@/modules/customer-auth/schemas/customer-auth.schemas';
import { register } from '@/modules/customer-auth/services/customer-auth.service';
import { ValidationError } from '@/lib/errors';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 5 registrations / hour per IP — guards against mass fake-account creation.
    enforceRateLimit(`customer-register:${getClientIp(req)}`, 5, 60 * 60_000);

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة');

    const result = await register(parsed.data);
    return appData(result, 201);
  } catch (err) {
    return appError(err);
  }
}
