import type { OrderStatus } from '@prisma/client';

export const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: 'جديد', ACCEPTED: 'مقبول', PREPARING: 'قيد التجهيز', READY: 'جاهز',
  OUT_FOR_DELIVERY: 'خرج للتوصيل', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي', REJECTED: 'مرفوض',
};
export const paymentStatusLabels: Record<string, string> = {
  PENDING: 'بانتظار الدفع', COMPLETED: 'مدفوع', FAILED: 'فشل الدفع', REFUNDED: 'مسترد',
};
export const paymentMethodLabels: Record<string, string> = {
  CASH: 'نقدي', CARD: 'بطاقة', ONLINE: 'دفع إلكتروني', WALLET: 'محفظة', MANUAL_TRANSFER: 'تحويل يدوي',
};
export const deliveryMethodLabels: Record<string, string> = {
  PICKUP: 'استلام من المتجر', MERCHANT_DELIVERY: 'توصيل المتجر', WASLAK_DELIVERY: 'توصيل وصلة', EXTERNAL_DELIVERY: 'شركة شحن',
};
export function money(value: { toString(): string }, currency = 'SDG') {
  return `${Number(value.toString()).toLocaleString('ar', { maximumFractionDigits: 2 })} ${currency}`;
}
export function date(value: Date) {
  return value.toLocaleString('ar', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' });
}
