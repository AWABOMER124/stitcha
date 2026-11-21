import { NextResponse } from 'next/server';
import { processPaymobWebhook } from '@/modules/paymob-payments/paymob-payments.service';
import { handleError } from '@/lib/errors/handler';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length')) > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  try {
    const result = await processPaymobWebhook(raw, new URL(request.url).searchParams.get('hmac'));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode });
  }
}
