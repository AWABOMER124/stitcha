import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { refreshSubscriptionCheckoutStatus, retrySubscriptionCheckout } from '@/modules/subscription-payments/checkout-status.service';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const session = await auth();
    if (!session?.user?.merchantId || !['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(session.user.role)) throw new UnauthorizedError();
    const merchantId = session.user.merchantId;
    if (!checkRateLimit(`subscription-status:${merchantId}`, 30, 60_000)) return NextResponse.json({ error: 'انتظر قليلًا ثم حاول مجددًا.' }, { status: 429, headers });
    const input = z.object({ requestId: z.string().min(1).max(180), action: z.enum(['check', 'retry']).default('check') }).strict().parse(await request.json());
    if (input.action === 'retry') {
      const selected = await retrySubscriptionCheckout(merchantId, input.requestId);
      return NextResponse.json({ checkoutPath: `/dashboard/subscription/checkout?request=${selected.id}` }, { headers });
    }
    return NextResponse.json(await refreshSubscriptionCheckoutStatus(merchantId, input.requestId), { headers });
  } catch (error) { const handled = handleError(error); return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode, headers }); }
}
