import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { ValidationError } from '@/lib/errors';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { refreshSchema } from '@/modules/customer-auth/schemas/customer-auth.schemas';
import { refresh } from '@/modules/customer-auth/services/customer-auth.service';

export async function POST(req: NextRequest) {
  try {
    enforceRateLimit(`customer-refresh:${getClientIp(req)}`, 30, 15 * 60_000);
    const parsed = refreshSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'رمز التجديد غير صالح');
    }
    return appData(await refresh(parsed.data.refreshToken));
  } catch (err) {
    return appError(err);
  }
}
