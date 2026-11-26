import type { QuoteItem, SalesSettings } from '@/modules/assisted-sales/policy';

export type SalesQuoteRow = {
  id: string; version: number; createdById: string; customerName: string; customerPhone: string;
  items: QuoteItem[]; subtotal: number; deliveryFee: number; total: number; currency: string; discountPercent: number;
  paymentMethod: 'ONLINE' | 'CASH'; deliveryMethod: 'PICKUP' | 'MERCHANT_DELIVERY'; notes: string;
  status: string; state: string; token: string | null; expiresAt: string; createdAt: string;
  order: { id: string; status: string; orderNumber: string; payment: { status: string } | null } | null;
  events: { id: string; type: string; actorId: string | null; at: string }[];
};
export type SalesWorkspaceProps = {
  settings: SalesSettings; owner: boolean; canApprove: boolean; canCreate: boolean; userId: string; discountLimit: number;
  gatewayReady: boolean; storeName: string; currency: string; origin: string;
  products: { id: string; name: string; price: number; sku: string | null }[];
  staff: { userId: string; name: string }[]; quotes: SalesQuoteRow[]; total: number; page: number; search: string; status: string;
};
export const STATE_LABELS: Record<string, string> = { OPEN: 'جاهز للإرسال', PENDING_APPROVAL: 'بانتظار موافقة', EXPIRED: 'منتهي الصلاحية', CONVERTED: 'تم إنشاء الطلب', CANCELLED: 'ملغي', PAID: 'مدفوع', REFUNDED: 'تم رد المبلغ', PAYMENT_FAILED: 'الدفع يحتاج مراجعة' };
export const inputClass = 'mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';
export const buttonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#087d82] px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d82] disabled:opacity-50';
