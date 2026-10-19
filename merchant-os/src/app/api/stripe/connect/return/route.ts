import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { resolvePublicOrigin } from '@/lib/public-origin';
import { refreshMerchantStripeAccount } from '@/modules/stripe-payments/stripe-payments.service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request.headers);
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.redirect(new URL('/login', origin));
  try {
    const account = await refreshMerchantStripeAccount(session.user.merchantId);
    const ready = account.detailsSubmitted && account.chargesEnabled && account.payoutsEnabled;
    return NextResponse.redirect(new URL(`/dashboard/storefront/payments?stripe=${ready ? 'connected' : 'pending'}`, origin));
  } catch {
    return NextResponse.redirect(new URL('/dashboard/storefront/payments?stripe=error', origin));
  }
}
