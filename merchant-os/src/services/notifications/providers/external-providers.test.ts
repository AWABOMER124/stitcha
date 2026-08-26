import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailProvider } from './email.provider';
import { SMSProvider } from './sms.provider';
import { WhatsAppProvider } from './whatsapp.provider';

const payload = {
  type: 'SYSTEM' as const,
  channel: 'EMAIL' as const,
  recipient: '+249111222333',
  title: 'Subject',
  body: 'Message body',
};

const ENV_KEYS = [
  'RESEND_API_KEY', 'EMAIL_FROM', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
  'TWILIO_SMS_FROM', 'WHATSAPP_CLOUD_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_GRAPH_API_VERSION',
] as const;

describe('external notification providers', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fails closed when email credentials are absent', async () => {
    await expect(new EmailProvider().send(payload)).rejects.toThrow('Email delivery is not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends email through Resend', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.EMAIL_FROM = 'WASLA <notify@example.com>';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    await new EmailProvider().send(payload);
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer resend-key' }),
    }));
  });

  it('fails closed when SMS credentials are absent', async () => {
    await expect(new SMSProvider().send({ ...payload, channel: 'SMS' })).rejects.toThrow('SMS delivery is not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends SMS through Twilio', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'account';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_SMS_FROM = '+15550001111';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 201 }));
    await new SMSProvider().send({ ...payload, channel: 'SMS' });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/Accounts/account/Messages.json'), expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from('account:token').toString('base64')}` }),
    }));
  });

  it('fails closed when WhatsApp credentials are absent', async () => {
    await expect(new WhatsAppProvider().send({ ...payload, channel: 'WHATSAPP' })).rejects.toThrow('WhatsApp delivery is not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends a WhatsApp Cloud API text message', async () => {
    process.env.WHATSAPP_CLOUD_API_TOKEN = 'wa-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'vXX.X';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    await new WhatsAppProvider().send({ ...payload, channel: 'WHATSAPP' });
    expect(fetch).toHaveBeenCalledWith('https://graph.facebook.com/vXX.X/phone-id/messages', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer wa-token' }),
    }));
    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toMatchObject({ to: '249111222333', type: 'text' });
  });
});
