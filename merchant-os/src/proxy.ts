import { NextRequest, NextResponse } from 'next/server';
import { resolveMerchantByCustomHostname } from '@/modules/merchant-domains/merchant-domains.service';

function requestHostname(request: NextRequest) {
  return (request.headers.get('x-forwarded-host')?.split(',')[0] || request.headers.get('host') || '').trim().toLowerCase().replace(/:\d+$/, '');
}

function isPlatformHostname(hostname: string) {
  const isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
  if (!hostname || isIpAddress || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'wassla-sd.shop' || hostname.endsWith('.wassla-sd.shop')) return true;
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://wassla-sd.shop').hostname.toLowerCase();
    return hostname === configured;
  } catch { return false; }
}

export async function proxy(request: NextRequest) {
  const hostname = requestHostname(request);
  if (isPlatformHostname(hostname)) return NextResponse.next();
  const slug = await resolveMerchantByCustomHostname(hostname);
  if (!slug) return new NextResponse('Store domain is not active', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (request.nextUrl.pathname.startsWith(`/store/${slug}`)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/store/${slug}${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads).*)'],
};
