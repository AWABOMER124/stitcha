import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireCustomerAuth } from '@/lib/auth/customer-session';
import { getOrderHistoryForAccount } from '@/modules/storefront/services/storefront.service';

export async function GET(req: NextRequest) {
  try {
    const account = await requireCustomerAuth(req);
    const orders = await getOrderHistoryForAccount(account.id);
    return appData(orders);
  } catch (err) {
    return appError(err);
  }
}
