import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { handleError } from '@/lib/errors/handler';
import { resolvePublicOrigin } from '@/lib/public-origin';
import { createSubscriptionStripeCheckout } from '@/modules/stripe-payments/stripe-payments.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const merchantId = session?.user?.merchantId;
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkRateLimit(`stripe-subscription:${merchantId}:${getClientIp(request)}`, 6, 15 * 60_000)) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }
    const checkout = await createSubscriptionStripeCheckout({
      merchantId,
      customerEmail: session.user.email,
      origin: resolvePublicOrigin(request.headers),
    });
    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode });
  }
}
