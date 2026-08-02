import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireCustomerAuth } from '@/lib/auth/customer-session';
import { deviceTokenSchema } from '@/modules/customer-auth/schemas/customer-auth.schemas';
import { updateDeviceToken } from '@/modules/customer-auth/services/customer-auth.service';
import { ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const account = await requireCustomerAuth(req);
    const body = await req.json();
    const parsed = deviceTokenSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة');

    await updateDeviceToken(account.id, parsed.data.token);
    return appData({ success: true });
  } catch (err) {
    return appError(err);
  }
}
