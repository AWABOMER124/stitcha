import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { revokeCurrentCustomerSession } from '@/lib/auth/customer-session';

export async function POST(req: NextRequest) {
  try {
    await revokeCurrentCustomerSession(req);
    return appData({ revoked: true });
  } catch (err) {
    return appError(err);
  }
}
