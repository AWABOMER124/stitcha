import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { UnauthorizedError, handleError } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { resolvePublicOrigin } from '@/lib/public-origin';
import { createMarketSubscriptionCheckout } from '@/modules/paymob-payments/market-payments.service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const merchantId = session?.user?.merchantId;
    if (!merchantId || !['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(session.user.role)) throw new UnauthorizedError('Only the store owner or administrator may start subscription payment');
    if (!checkRateLimit(`subscription-checkout:${merchantId}:${getClientIp(request)}`, 6, 15 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    const raw = await request.text();
    let body: unknown;
    try { body = raw ? JSON.parse(raw) : {}; } catch { return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 }); }
    const parsed = z.object({ planChangeRequestId: z.string().min(1).max(180).optional() }).strict().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
    return NextResponse.json(await createMarketSubscriptionCheckout({ planChangeRequestId: parsed.data.planChangeRequestId, merchantId, customerEmail: session.user.email, origin: resolvePublicOrigin(request.headers) }));
  } catch (error) { const handled = handleError(error); return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode }); }
}
