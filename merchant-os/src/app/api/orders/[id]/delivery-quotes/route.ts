import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireCustomerAuth } from '@/lib/auth/customer-session';
import { appData, appError } from '@/lib/http/app-response';
import { BusinessRuleError } from '@/lib/errors';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { quotePlatformDelivery } from '@/modules/delivery-partners/services/delivery-operations.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.PLATFORM_DELIVERY_ENABLED !== 'true') {
      throw new BusinessRuleError('Platform delivery is not available yet');
    }
    const account = await requireCustomerAuth(req);
    enforceRateLimit(`delivery-quote:${account.id}`, 20, 60_000);
    const { id } = await params;
    const owned = await prisma.order.findFirst({ where: { id, customer: { accountId: account.id } }, select: { id: true } });
    if (!owned) throw new BusinessRuleError('Order not found');
    return appData(await quotePlatformDelivery(id));
  } catch (error) {
    return appError(error);
  }
}
