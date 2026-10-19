import { NextResponse } from 'next/server';
import { resolvePublicOrigin } from '@/lib/public-origin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return NextResponse.redirect(new URL('/dashboard/storefront/payments?stripe=centralized', resolvePublicOrigin(request.headers)), 303);
}
