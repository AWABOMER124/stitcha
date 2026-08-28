import type { NotificationPayload, NotificationProvider } from '../types';

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
    if (!token || !phoneNumberId || !apiVersion) {
      throw new Error('WhatsApp delivery is not configured (WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_GRAPH_API_VERSION are required)');
    }

    const authenticationCode = payload.metadata?.kind === 'whatsapp_authentication'
      ? String(payload.metadata.code ?? '')
      : null;
    const message = authenticationCode
      ? buildAuthenticationTemplate(payload.recipient, authenticationCode)
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.recipient.replace(/^\+/, ''),
          type: 'text',
          text: { preview_url: false, body: payload.body },
        };

    const response = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      },
    );

    if (!response.ok) {
      throw new Error(`WhatsApp provider rejected the message (${response.status}): ${await safeError(response)}`);
    }
  }
}

export function assertWhatsAppOtpConfigured(): void {
  const required = [
    'WHATSAPP_CLOUD_API_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_GRAPH_API_VERSION',
    'WHATSAPP_OTP_TEMPLATE_NAME',
  ];
  if (required.some((key) => !process.env[key])) {
    throw new Error('خدمة تأكيد واتساب غير مهيأة بعد');
  }
}

function buildAuthenticationTemplate(recipient: string, code: string) {
  assertWhatsAppOtpConfigured();
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || 'ar' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ],
    },
  };
}

async function safeError(response: Response): Promise<string> {
  return (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 300) || 'empty response';
}
