import { ConflictError, ValidationError } from '@/lib/errors';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/crypto/secret';
import * as repo from '../repositories/whatsapp-channel.repository';
import type { SaveWhatsAppConfigInput } from '../schemas/whatsapp-channel.schemas';

const GRAPH_API_VERSION = 'v21.0';

// ============================================================================
// WhatsApp Channel Service — Business logic
// Each merchant sends/receives customer inbox messages through their own
// WhatsApp Business number (Meta Cloud API), configured here.
// ============================================================================

/** Merchant-facing config view — never returns the raw access token. */
export async function getConfig(merchantId: string) {
  const config = await repo.findByMerchant(merchantId);
  if (!config) return { isConfigured: false as const };
  return {
    isConfigured: true as const,
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    displayPhone: config.displayPhone,
    isActive: config.isActive,
    accessTokenPreview: maskSecret(decryptSecret(config.accessToken)),
    updatedAt: config.updatedAt,
  };
}

export async function saveConfig(merchantId: string, input: SaveWhatsAppConfigInput) {
  const existingForNumber = await repo.findByPhoneNumberId(input.phoneNumberId);
  if (existingForNumber && existingForNumber.merchantId !== merchantId) {
    throw new ConflictError('رقم واتساب هذا مرتبط بالفعل بمتجر آخر');
  }

  let encryptedAccessToken: string;
  if (input.accessToken) {
    encryptedAccessToken = encryptSecret(input.accessToken);
  } else {
    const existing = await repo.findByMerchant(merchantId);
    if (!existing) throw new ValidationError('رمز الوصول مطلوب عند الربط لأول مرة');
    encryptedAccessToken = existing.accessToken;
  }

  await repo.upsert(merchantId, {
    phoneNumberId: input.phoneNumberId,
    wabaId: input.wabaId,
    displayPhone: input.displayPhone,
    encryptedAccessToken,
  });
  return getConfig(merchantId);
}

export async function removeConfig(merchantId: string) {
  await repo.deactivate(merchantId);
}

/** Internal: decrypted credentials for sending, never exposed to the client. */
async function getSendCredentials(merchantId: string) {
  const config = await repo.findByMerchant(merchantId);
  if (!config || !config.isActive) return null;
  return { phoneNumberId: config.phoneNumberId, accessToken: decryptSecret(config.accessToken) };
}

/** Internal: routes an inbound Meta webhook message to its owning merchant. */
export async function findMerchantByPhoneNumberId(phoneNumberId: string) {
  const config = await repo.findByPhoneNumberId(phoneNumberId);
  if (!config || !config.isActive) return null;
  return { merchantId: config.merchantId };
}

/**
 * Send a free-form text message via the merchant's own WhatsApp number.
 * Note: Meta only allows free-form replies within a 24h customer service
 * window since the customer's last message — outside that window this call
 * fails unless using a pre-approved message template (not implemented here).
 */
export async function sendMessage(
  merchantId: string,
  to: string,
  text: string
): Promise<{ success: true } | { success: false; error: string }> {
  const creds = await getSendCredentials(merchantId);
  if (!creds) return { success: false, error: 'قناة واتساب غير مُفعّلة لهذا المتجر' };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { success: false, error: errBody?.error?.message ?? `فشل الإرسال عبر واتساب (${res.status})` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'فشل الإرسال عبر واتساب' };
  }
}
