import type { NotificationPayload, NotificationProvider } from '../types';

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    if (platformProvider() === 'evolution') {
      await sendWithEvolution(payload);
      return;
    }
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
  if (platformProvider() === 'evolution') {
    const required = ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE_NAME'];
    if (required.some((key) => !process.env[key])) {
      throw new Error('خدمة تأكيد واتساب عبر Evolution غير مهيأة بعد');
    }
    return;
  }
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

function platformProvider(): 'meta' | 'evolution' {
  return process.env.PLATFORM_WHATSAPP_PROVIDER?.trim().toLowerCase() === 'evolution'
    ? 'evolution'
    : 'meta';
}

async function sendWithEvolution(payload: NotificationPayload): Promise<void> {
  assertWhatsAppOtpConfigured();
  const baseUrl = process.env.EVOLUTION_API_URL!.replace(/\/+$/, '');
  const instance = process.env.EVOLUTION_INSTANCE_NAME!;
  const body = process.env.EVOLUTION_SEND_PAYLOAD_STYLE === 'flat'
    ? { number: normalizeEvolutionNumber(payload.recipient), text: payload.body }
    : { number: normalizeEvolutionNumber(payload.recipient), textMessage: { text: payload.body } };
  const response = await fetch(
    `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        apikey: process.env.EVOLUTION_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`Evolution WhatsApp rejected the message (${response.status}): ${await safeError(response)}`);
  }
}

function normalizeEvolutionNumber(value: string): string {
  const digits = value.trim().replace(/^00/, '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('Invalid WhatsApp recipient number');
  return digits;
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
