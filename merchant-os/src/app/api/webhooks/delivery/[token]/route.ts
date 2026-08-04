import { NextResponse } from 'next/server';
import { handleProviderWebhook } from '@/modules/delivery-integrations/services/delivery-integrations.service';

/**
 * Generic inbound webhook for any configured delivery provider. The
 * unguessable `token` segment (DeliveryProviderConfig.webhookToken) routes
 * the call back to the right company + adapter — that URL secrecy is the
 * first layer of trust, same idea as WhatsAppConfig.phoneNumberId routing
 * /api/webhooks/whatsapp. A real adapter can additionally verify a
 * provider-specific signature header inside its own parseWebhookEvent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    await handleProviderWebhook(token, rawBody, headers);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[delivery-webhook] processing failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 400 });
  }
}
