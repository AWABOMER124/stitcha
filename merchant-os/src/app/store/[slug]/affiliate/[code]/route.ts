import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { AFFILIATE_COOKIE, affiliateCookiePath, createStoreAffiliateVisit } from '@/modules/store-affiliates/store-affiliates.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await context.params;
  const destination = new URL(`/store/${encodeURIComponent(slug)}`, request.url);
  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store');
  if (!checkRateLimit(`affiliate-click:${slug}:${getClientIp(request)}`, 60, 60_000)) return response;
  try {
    const visit = await createStoreAffiliateVisit(slug, code);
    if (visit) {
      response.cookies.set(AFFILIATE_COOKIE, visit.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: affiliateCookiePath(slug),
        expires: visit.expiresAt,
      });
    }
  } catch (error) {
    console.error('[store-affiliates] Failed to record affiliate visit', error);
  }
  return response;
}
