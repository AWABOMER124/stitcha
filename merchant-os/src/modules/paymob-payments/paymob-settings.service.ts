import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret';
import { BusinessRuleError, ConflictError, ValidationError } from '@/lib/errors';
import { PaymobGateway, type PaymobConfig } from '@/services/payment-gateways/paymob.gateway';

export const PAYMOB_LEGAL_MERCHANT = 'مؤسسة فهد لاين';

export async function getPaymobSettingsSummary() {
  const row = await prisma.paymobSettings.findUnique({ where: { id: 'SA' } });
  const ids = parseIds(row?.integrationIds);
  const saved = { secretKey: Boolean(row?.secretKeyEncrypted), apiKey: Boolean(row?.apiKeyEncrypted), hmac: Boolean(row?.hmacEncrypted), publicKey: Boolean(row?.publicKey) };
  return { provider: 'PAYMOB' as const, enabled: row?.enabled ?? false, mode: row?.mode === 'LIVE' ? 'LIVE' as const : 'TEST' as const,
    configured: Object.values(saved).every(Boolean) && ids.length > 0, saved, integrationIds: ids, publicKey: row?.publicKey ?? '', legalMerchant: PAYMOB_LEGAL_MERCHANT };
}

export async function getPaymobGateway() {
  const row = await prisma.paymobSettings.findUnique({ where: { id: 'SA' } });
  const config: PaymobConfig = { enabled: row?.enabled ?? false, mode: row?.mode === 'LIVE' ? 'LIVE' : 'TEST', integrationIds: parseIds(row?.integrationIds),
    publicKey: row?.publicKey ?? undefined, secretKey: row?.secretKeyEncrypted ? decryptSecret(row.secretKeyEncrypted) : undefined,
    apiKey: row?.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : undefined, hmacSecret: row?.hmacEncrypted ? decryptSecret(row.hmacEncrypted) : undefined };
  return { gateway: new PaymobGateway(config), config };
}

const settingsSchema = z.object({
  enabled: z.boolean(), mode: z.enum(['TEST', 'LIVE']),
  publicKey: z.string().trim().max(2048), secretKey: z.string().trim().max(4096), apiKey: z.string().trim().max(8192), hmac: z.string().trim().max(4096),
  integrationIds: z.array(z.number().int().positive().safe()).max(30),
});

export async function savePaymobSettings(input: z.input<typeof settingsSchema>, userId: string) {
  const data = settingsSchema.parse(input);
  for (const secret of [data.secretKey, data.apiKey, data.hmac]) {
    if (secret && secret.length < 16) throw new ValidationError('أدخل مفتاح Paymob كاملًا.');
  }
  for (const key of [data.publicKey, data.secretKey]) {
    const mode = key.match(/_(test|live)_/i)?.[1]?.toUpperCase();
    if (mode && mode !== data.mode) throw new ValidationError('نوع المفتاح لا يطابق بيئة الاختبار أو التشغيل المختارة.');
  }
  const previous = await prisma.paymobSettings.findUnique({ where: { id: 'SA' } });
  const changingCredentials = Boolean(data.secretKey || data.apiKey || data.hmac || (previous && previous.mode !== data.mode)
    || (previous && data.publicKey && data.publicKey !== previous.publicKey) || (previous && JSON.stringify(parseIds(previous.integrationIds)) !== JSON.stringify(data.integrationIds)));
  if (changingCredentials && await prisma.onlineCheckoutAttempt.count({ where: { provider: 'paymob' } })) {
    throw new ConflictError('تغيير حساب Paymob بعد استخدامه يحتاج نقلًا إشرافيًا يحفظ التحقق من المدفوعات والاستردادات السابقة. يمكنك إيقاف استقبال مدفوعات جديدة دون تغيير المفاتيح.');
  }
  const fields = { enabled: data.enabled, mode: data.mode, integrationIds: [...new Set(data.integrationIds)], publicKey: data.publicKey || previous?.publicKey || null,
    secretKeyEncrypted: data.secretKey ? encryptSecret(data.secretKey) : previous?.secretKeyEncrypted ?? null,
    apiKeyEncrypted: data.apiKey ? encryptSecret(data.apiKey) : previous?.apiKeyEncrypted ?? null,
    hmacEncrypted: data.hmac ? encryptSecret(data.hmac) : previous?.hmacEncrypted ?? null, updatedById: userId };
  if (data.enabled && (!fields.publicKey || !fields.secretKeyEncrypted || !fields.apiKeyEncrypted || !fields.hmacEncrypted || !fields.integrationIds.length)) throw new BusinessRuleError('أضف جميع المفاتيح ومعرّفات التكامل قبل تفعيل Paymob.');
  await prisma.paymobSettings.upsert({ where: { id: 'SA' }, create: { id: 'SA', ...fields }, update: fields });
  return getPaymobSettingsSummary();
}

function parseIds(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0) : [];
}
