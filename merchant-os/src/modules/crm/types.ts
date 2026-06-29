import type { CustomerSegment, PromoType } from '@prisma/client';
export type { CustomerSegment, PromoType };

export const SEGMENT_CONFIG: Record<CustomerSegment, { label: string; color: string; bg: string; description: string }> = {
  NEW:      { label: 'جديد',     color: 'text-blue-700',    bg: 'bg-blue-100',    description: 'طلب واحد فقط' },
  REGULAR:  { label: 'منتظم',   color: 'text-indigo-700',  bg: 'bg-indigo-100',  description: '2–9 طلبات' },
  VIP:      { label: 'VIP',     color: 'text-amber-700',   bg: 'bg-amber-100',   description: '10+ طلبات' },
  INACTIVE: { label: 'غير نشط', color: 'text-stone-600',   bg: 'bg-stone-100',   description: 'لم يطلب منذ 30 يوم' },
  BLOCKED:  { label: 'محظور',   color: 'text-red-700',     bg: 'bg-red-100',     description: 'محظور من الطلب' },
};

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  PERCENTAGE:    'خصم نسبة مئوية',
  FIXED_AMOUNT:  'خصم مبلغ ثابت',
  FREE_DELIVERY: 'توصيل مجاني',
};

export interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  regularCustomers: number;
  vipCustomers: number;
  inactiveCustomers: number;
  blockedCustomers: number;
  totalRevenue: number;
}
