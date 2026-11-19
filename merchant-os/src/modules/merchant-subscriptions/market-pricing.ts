import { ValidationError } from '@/lib/errors';

export type SubscriptionMarket = 'SD' | 'SA';
export type PlanInterval = 'MONTHLY' | 'YEARLY';

export function resolveMarket(value: unknown): SubscriptionMarket {
  return value === 'SA' ? 'SA' : 'SD';
}

export function planBelongsToMarket(code: string, market: SubscriptionMarket): boolean {
  return code === 'FREE' || (code.startsWith('SA_') ? market === 'SA' : market === 'SD');
}

/** New requests lock their commercial terms; legacy requests retain their original fallback. */
export function planRequestQuote(request: {
  quotedAmount?: unknown; quotedCurrency?: string | null; billingInterval?: string;
  targetPlan: { monthlyPrice: unknown; yearlyPrice?: unknown; currency: string };
}) {
  const billingInterval: PlanInterval = request.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const raw = request.quotedAmount ?? (billingInterval === 'YEARLY' ? request.targetPlan.yearlyPrice : request.targetPlan.monthlyPrice);
  if (raw == null) throw new ValidationError('Annual billing is not available for this plan');
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('The selected plan does not require payment');
  return { amount, currency: request.quotedCurrency ?? request.targetPlan.currency, billingInterval };
}
