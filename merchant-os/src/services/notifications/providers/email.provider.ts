import type { NotificationPayload, NotificationProvider } from '../types';

export class EmailProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error('Email delivery is not configured (RESEND_API_KEY and EMAIL_FROM are required)');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [payload.recipient], subject: payload.title, text: payload.body }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected the message (${response.status}): ${await safeError(response)}`);
    }
  }
}

async function safeError(response: Response): Promise<string> {
  return (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 300) || 'empty response';
}
