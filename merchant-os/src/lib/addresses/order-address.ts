import { z } from 'zod';
import { SUDAN_STATES } from '@/lib/geography/sudan';
import { normalizePlace, stateForCity } from '@/lib/geography/regional-coverage';

const optionalText = (max: number) => z.preprocess(value => typeof value === 'string' ? value.trim() || undefined : value == null ? undefined : value,
  z.string().trim().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'نص العنوان غير صالح').optional());
export const orderAddressFields = {
  customerState: optionalText(120).refine(value => !value || SUDAN_STATES.some(item => normalizePlace(item.name) === normalizePlace(value)), 'اختر ولاية صحيحة.').transform(value => SUDAN_STATES.find(item => normalizePlace(item.name) === normalizePlace(value))?.name ?? value).optional(),
  customerCity: optionalText(120),
  customerDistrict: optionalText(120),
  customerAddressDescription: optionalText(1000),
  deliveryAddressVersion: z.enum(['2', '3']).optional(),
};
export type OrderAddressInput = {
  customerState?: string; customerCity?: string; customerDistrict?: string; customerAddress?: string;
  customerAddressDescription?: string; deliveryAddressVersion?: '2' | '3'; deliveryMethod?: string;
};
export function validateOrderAddress(value: OrderAddressInput, context: z.RefinementCtx) {
  if (value.customerState && stateForCity(value.customerCity) && stateForCity(value.customerCity) !== value.customerState) context.addIssue({ code: 'custom', path: ['customerState'], message: 'المدينة لا تتبع الولاية المختارة.' });
  if (!value.deliveryAddressVersion || value.deliveryMethod === 'PICKUP') return;
  if (value.deliveryAddressVersion === '3' && !value.customerState) context.addIssue({ code: 'custom', path: ['customerState'], message: 'اختر الولاية.' });
  for (const [key, label] of [['customerCity', 'المدينة'], ['customerDistrict', 'الحي'], ['customerAddress', 'العنوان التفصيلي']] as const) {
    if (!value[key]?.trim() || value[key]!.trim().length < 2) context.addIssue({ code: 'custom', path: [key], message: `أدخل ${label}` });
  }
}
export function getOrderDeliveryAddress(order: {
  customerAddress?: string | null; customer?: { address?: string | null } | null;
  delivery?: { state?: string | null; city?: string | null; area?: string | null; address?: string | null; notes?: string | null } | null;
}) {
  const text = (value: string | null | undefined) => value?.trim() || null;
  return { state: text(order.delivery?.state) ?? stateForCity(order.delivery?.city), city: text(order.delivery?.city), district: text(order.delivery?.area),
    address: text(order.delivery?.address) ?? text(order.customerAddress) ?? text(order.customer?.address),
    addressDescription: text(order.delivery?.notes) };
}

export function hasCompleteDeliveryAddress(address: ReturnType<typeof getOrderDeliveryAddress>) {
  return [address.city, address.district, address.address].every(value => !!value && value.trim().length >= 2);
}
