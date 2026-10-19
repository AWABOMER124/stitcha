import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { resolvePublicOrigin } from '@/lib/public-origin';
import { startMerchantStripeOnboarding } from '@/modules/stripe-payments/stripe-payments.service';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  const merchantId = session?.user?.merchantId;
  if (!merchantId) return NextResponse.redirect(new URL('/login', resolvePublicOrigin(request.headers)), 303);
  if (!checkRateLimit(`stripe-connect:${merchantId}:${getClientIp(request)}`, 5, 15 * 60_000)) {
    return NextResponse.redirect(new URL('/dashboard/storefront/payments?stripe=rate-limited', resolvePublicOrigin(request.headers)), 303);
  }
  try {
    const form = await request.formData();
    const result = await startMerchantStripeOnboarding({
      merchantId,
      email: session.user.email,
      country: String(form.get('country') ?? ''),
      origin: resolvePublicOrigin(request.headers),
    });
    return NextResponse.redirect(result.url, 303);
  } catch {
    return NextResponse.redirect(new URL('/dashboard/storefront/payments?stripe=error', resolvePublicOrigin(request.headers)), 303);
  }
}
