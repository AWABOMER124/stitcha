import { z } from 'zod';

const money = z.number().finite().min(0).max(999999).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, 'استخدم منزلتين عشريتين كحد أقصى');
export const salesSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  defaultExpiryHours: z.number().int().min(1).max(720).default(48),
  staffDiscountPercent: z.number().min(0).max(100).default(10),
  allowCod: z.boolean().default(true),
  allowPickup: z.boolean().default(true),
  defaultDeliveryFee: money.default(0),
  checkoutTitle: z.string().trim().min(2).max(100).default('عرضك الخاص جاهز'),
  terms: z.string().trim().max(2000).default(''),
  whatsappTemplate: z.string().trim().min(1).max(1000).default('مرحبًا {customer}، هذا عرضك من {store} بقيمة {total} {currency}. راجع التفاصيل وأكمل طلبك: {link}'),
  staffRules: z.array(z.object({
    userId: z.string().cuid(),
    discountPercent: z.number().min(0).max(100),
    canApprove: z.boolean().default(false),
    canViewAll: z.boolean().default(false),
    disabled: z.boolean().default(false),
  })).max(200).default([]),
}).refine(v => v.whatsappTemplate.includes('{link}'), 'يجب أن تحتوي الرسالة على {link}');
export type SalesSettings = z.infer<typeof salesSettingsSchema>;
export const DEFAULT_SALES_SETTINGS = salesSettingsSchema.parse({});

export const quoteInputSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().regex(/^\+?[0-9]{9,15}$/, 'أدخل رقم واتساب صحيحًا مع رمز الدولة'),
  items: z.array(z.object({ productId: z.string().cuid(), quantity: z.number().int().min(1).max(10000), unitPrice: money })).min(1).max(100)
    .refine(items => new Set(items.map(i => i.productId)).size === items.length, 'ادمج كميات المنتج المكرر'),
  deliveryFee: money,
  expiryHours: z.number().int().min(1).max(720),
  paymentMethod: z.enum(['ONLINE', 'CASH']),
  deliveryMethod: z.enum(['PICKUP', 'MERCHANT_DELIVERY']),
  notes: z.string().trim().max(1000).default(''),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteItem = { productId: string; name: string; sku: string | null; quantity: number; unitPrice: number; listPrice: number; total: number };
export type SavedQuote = { id: string; status: string; token: string | null; customerName: string; customerPhone: string; total: number; currency: string };

export const checkoutInputSchema = z.object({
  customerName: z.string().trim().min(2).max(120).optional(),
  customerPhone: z.string().trim().transform(v => v.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+?[0-9]{9,15}$/, 'أدخل رقم جوال صحيحًا مع رمز الدولة')).optional(),
  state: z.string().trim().min(2).max(120).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  district: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(5).max(500).optional(),
  description: z.string().trim().max(500).optional(),
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
}).refine(v => (v.lat === undefined) === (v.lng === undefined), 'أرسل إحداثيات الموقع كاملة');

export function priceQuote(items: QuoteItem[], deliveryFee: number) {
  const subtotalMinor = items.reduce((s, i) => s + Math.round(i.unitPrice * 100) * i.quantity, 0);
  // Assess the highest individual discount: premium lines cannot hide a prohibited discount.
  const discountPercent = Math.max(0, ...items.map(i => i.listPrice > 0 ? (1 - i.unitPrice / i.listPrice) * 100 : 0));
  const totalMinor = subtotalMinor + Math.round(deliveryFee * 100);
  if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0 || totalMinor > 9999999999) throw new Error('إجمالي العرض خارج النطاق المسموح');
  return { subtotal: subtotalMinor / 100, total: totalMinor / 100, discountPercent: Math.round(discountPercent * 100) / 100 };
}

export function renderSalesMessage(template: string, values: Record<'customer' | 'store' | 'total' | 'currency' | 'link', string>) {
  return template.replace(/\{(customer|store|total|currency|link)\}/g, (_, key: keyof typeof values) => values[key]);
}

export function quoteState(quote: { status: string; expiresAt: Date | string; order?: { status: string; payment?: { status: string } | null } | null }, now = new Date()) {
  if (quote.order) {
    if (['CANCELLED', 'REJECTED'].includes(quote.order.status)) return 'CANCELLED';
    if (quote.order.payment?.status === 'COMPLETED') return 'PAID';
    if (quote.order.payment?.status === 'REFUNDED') return 'REFUNDED';
    if (quote.order.payment?.status === 'FAILED') return 'PAYMENT_FAILED';
    return 'CONVERTED';
  }
  if (quote.status === 'OPEN' && new Date(quote.expiresAt) <= now) return 'EXPIRED';
  return quote.status;
}
