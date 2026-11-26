import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { appError } from '@/lib/http/app-response';
import { checkoutQuote } from '@/modules/assisted-sales/service';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { resolvePublicOrigin } from '@/lib/public-origin';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ message: 'العرض غير متاح' }, { status: 404 });
    if (request.headers.get('origin') !== resolvePublicOrigin(request.headers)) return NextResponse.json({ message: 'طلب غير مسموح' }, { status: 403 });
    enforceRateLimit(`sales-checkout:${getClientIp(request)}`, 15, 60000);
    enforceRateLimit(`sales-token:${token}`, 10, 60000);
    const result = await checkoutQuote(token, await request.json(), resolvePublicOrigin(request.headers));
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ message: 'راجع بيانات عنوان التوصيل' }, { status: 400 });
    return appError(error);
  }
}
