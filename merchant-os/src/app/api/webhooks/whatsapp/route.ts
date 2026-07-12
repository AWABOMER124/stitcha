import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import prisma from '@/lib/db/prisma';
import { findMerchantByPhoneNumberId } from '@/modules/whatsapp-channel/services/whatsapp-channel.service';

/**
 * Meta WhatsApp Cloud API webhook. One shared URL/App for the whole
 * platform — each inbound message carries its own `phone_number_id`, which
 * we use to route it to the owning merchant's Conversation inbox.
 * Requires WHATSAPP_APP_SECRET (signature verification) and
 * WHATSAPP_WEBHOOK_VERIFY_TOKEN (Meta's one-time GET handshake) in env.
 */

// ============================================================================
// Verification handshake (Meta calls this once when you save the webhook URL)
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ============================================================================
// Inbound events
// ============================================================================
export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Always ack fast — Meta retries aggressively on non-200 responses.
  await processPayload(payload).catch((err) => console.error('[whatsapp-webhook] processing failed:', err));

  return NextResponse.json({ success: true });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[whatsapp-webhook] WHATSAPP_APP_SECRET not set — rejecting inbound webhook');
    return false;
  }
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const provided = signatureHeader.slice('sha256='.length);

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{ from: string; id: string; type: string; text?: { body?: string } }>;
      };
    }>;
  }>;
}

async function processPayload(payload: WhatsAppWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages;
      if (!phoneNumberId || !messages?.length) continue;

      const owner = await findMerchantByPhoneNumberId(phoneNumberId);
      if (!owner) {
        console.warn(`[whatsapp-webhook] no merchant configured for phone_number_id ${phoneNumberId}`);
        continue;
      }

      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) continue; // other types (media, etc.) not yet handled

        const contactName = value?.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name ?? null;

        const existing = await (prisma as any).conversation.findFirst({
          where: { merchantId: owner.merchantId, customerPhone: msg.from, channel: 'WHATSAPP' },
          select: { id: true },
        });

        const conversation = existing
          ? await (prisma as any).conversation.update({
              where: { id: existing.id },
              data: { status: 'OPEN', updatedAt: new Date(), ...(contactName ? { customerName: contactName } : {}) },
            })
          : await (prisma as any).conversation.create({
              data: {
                merchantId: owner.merchantId,
                channel: 'WHATSAPP',
                customerName: contactName,
                customerPhone: msg.from,
                status: 'OPEN',
              },
            });

        await (prisma as any).inboxMessage.create({
          data: {
            conversationId: conversation.id,
            content: msg.text.body,
            isFromCustomer: true,
            senderName: contactName,
          },
        });
      }
    }
  }
}
