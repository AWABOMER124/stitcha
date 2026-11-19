import { z } from 'zod';

export const audiences = ['MERCHANT', 'MARKETER', 'PARTNER'] as const;
export const channels = ['IN_APP', 'EMAIL', 'WHATSAPP'] as const;
export const segments = ['ALL', 'NOT_ACTIVATED', 'UNVERIFIED_IDENTITY', 'INCOMPLETE_SETUP', 'NO_PRODUCTS', 'NO_ORDERS', 'EMAIL_UNVERIFIED', 'PHONE_UNVERIFIED', 'ACTIVE', 'PARTNER_UNPUBLISHED'] as const;
export type Audience = typeof audiences[number];
export type Channel = typeof channels[number];
export type Segment = typeof segments[number];
export const audienceLabels: Record<Audience, string> = { MERCHANT: 'التجار', MARKETER: 'المسوقون', PARTNER: 'شركات الشحن' };
export const channelLabels: Record<Channel, string> = { IN_APP: 'داخل المنصة', EMAIL: 'البريد الإلكتروني', WHATSAPP: 'واتساب' };
export const segmentLabels: Record<Segment, string> = { ALL: 'جميع الحسابات', NOT_ACTIVATED: 'لم يفعّل الحساب أو المتجر', UNVERIFIED_IDENTITY: 'الهوية غير معتمدة', INCOMPLETE_SETUP: 'إعدادات غير مكتملة', NO_PRODUCTS: 'متجر بلا منتجات', NO_ORDERS: 'متجر بلا طلبات', EMAIL_UNVERIFIED: 'البريد غير مؤكد', PHONE_UNVERIFIED: 'الهاتف غير مؤكد', ACTIVE: 'حسابات نشطة', PARTNER_UNPUBLISHED: 'تطبيق الشحن غير منشور' };
export const filtersSchema = z.object({
  segment: z.enum(segments).default('ALL'),
  search: z.string().trim().max(150).default(''),
  userIds: z.array(z.string().cuid()).max(1000).default([]),
  minAgeDays: z.number().int().min(0).max(3650).default(0),
  maxAgeDays: z.number().int().min(0).max(3650).nullable().default(null),
}).refine(f => f.maxAgeDays === null || f.maxAgeDays >= f.minAgeDays, 'نطاق عمر الحساب غير صحيح');
export type RecipientFilters = z.infer<typeof filtersSchema>;
export const messageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  audience: z.enum(audiences),
  purpose: z.enum(['SERVICE', 'MARKETING']).default('SERVICE'),
  filters: filtersSchema,
  channels: z.array(z.enum(channels)).min(1).max(3).transform(v => [...new Set(v)]),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(5).max(3000),
  actionPath: z.string().max(300).nullable().default(null).refine(p => !p || (p.startsWith('/') && !p.startsWith('//') && !/[\\\r\n]/.test(p)), 'اختر رابطًا داخليًا في وصلة'),
  scheduledAt: z.iso.datetime({ offset: true }).nullable().default(null),
});
export type MessageInput = z.infer<typeof messageSchema>;
export const variableNames = ['name', 'business_name', 'platform_name', 'action_url', 'store_url'] as const;
export function renderMessage(text: string, values: Record<typeof variableNames[number], string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => {
    if (!(variableNames as readonly string[]).includes(key)) throw new Error(`متغير غير معروف: ${key}`);
    return values[key as typeof variableNames[number]];
  });
}
export function assertMessageVariables(text: string) {
  renderMessage(text, Object.fromEntries(variableNames.map(k => [k, 'اختبار'])) as Record<typeof variableNames[number], string>);
  const stripped = text.replace(/\{\{\s*[a-z_]+\s*\}\}/g, '');
  if (stripped.includes('{{') || stripped.includes('}}')) throw new Error('صيغة المتغيرات غير صحيحة');
}
