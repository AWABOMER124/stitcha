import { NextResponse } from 'next/server';
import { processStripeWebhook } from '@/modules/stripe-payments/stripe-payments.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await processStripeWebhook(rawBody, request.headers.get('stripe-signature'));
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('[stripe-webhook] Rejected event', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Webhook rejected' }, { status: 400 });
  }
}
