import type { NotificationPayload, NotificationProvider } from '../types';

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
    if (!token || !phoneNumberId || !apiVersion) {
      throw new Error('WhatsApp delivery is not configured (WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_GRAPH_API_VERSION are required)');
    }

    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.recipient.replace(/^\+/, ''),
          type: 'text',
          text: { preview_url: false, body: payload.body },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`WhatsApp provider rejected the message (${response.status}): ${await safeError(response)}`);
    }
  }
}

async function safeError(response: Response): Promise<string> {
  return (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 300) || 'empty response';
}
