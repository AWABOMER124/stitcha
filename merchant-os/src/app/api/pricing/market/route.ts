import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getMerchantSubscriptionMarket } from '@/modules/merchant-subscriptions/merchant-subscriptions.service';
import { detectedPricingMarket, PRICING_MARKET_COOKIE, selectPricingMarket, validPricingMarket } from '@/lib/pricing/visitor-market';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  let originHost: string | null = null;
  try { originHost = origin ? new URL(origin).host : null; } catch { /* Invalid origin is rejected below. */ }
  if (!originHost || !host || originHost !== host) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || (body.market !== null && !validPricingMarket(body.market))) {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
  }
  const session = await auth();
  const account = session?.user?.merchantId ? await getMerchantSubscriptionMarket(session.user.merchantId) : null;
  const selection = selectPricingMarket(account, detectedPricingMarket(request.headers), body.market);
  const response = NextResponse.json(selection, { headers: { 'Cache-Control': 'private, no-store' } });
  response.cookies.set(PRICING_MARKET_COOKIE, selection.market ?? '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: selection.market ? 180 * 24 * 60 * 60 : 0,
  });
  return response;
}
