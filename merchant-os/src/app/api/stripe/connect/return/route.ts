import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/public-origin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request.headers);
  return NextResponse.redirect(new URL('/dashboard/storefront/payments?stripe=centralized', origin));
}
