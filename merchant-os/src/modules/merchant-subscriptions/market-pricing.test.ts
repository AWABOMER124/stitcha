import { describe, expect, it } from 'vitest';
import { planBelongsToMarket, planRequestQuote, resolveMarket } from './market-pricing';

describe('market-specific subscription pricing', () => {
  it('keeps existing stores in Sudan and does not infer market from currency or phone', () => {
    expect(resolveMarket(undefined)).toBe('SD');
    expect(resolveMarket('SAR')).toBe('SD');
    expect(resolveMarket('SA')).toBe('SA');
    expect(planBelongsToMarket('SA_PRO', 'SD')).toBe(false);
    expect(planBelongsToMarket('PRO', 'SA')).toBe(false);
    expect(planBelongsToMarket('FREE', 'SA')).toBe(true);
  });
  it('charges the full annual price rather than the monthly amount', () => {
    expect(planRequestQuote({ billingInterval: 'YEARLY', targetPlan: { monthlyPrice: 49, yearlyPrice: 490, currency: 'SAR' } }))
      .toEqual({ amount: 490, currency: 'SAR', billingInterval: 'YEARLY' });
  });
  it('honors a locked price and currency after an admin catalog edit', () => {
    expect(planRequestQuote({ quotedAmount: '990.00', quotedCurrency: 'SAR', billingInterval: 'YEARLY', targetPlan: { monthlyPrice: 999, yearlyPrice: 9990, currency: 'USD' } }))
      .toEqual({ amount: 990, currency: 'SAR', billingInterval: 'YEARLY' });
  });
  it('rejects unsupported annual and invalid amounts', () => {
    expect(() => planRequestQuote({ billingInterval: 'YEARLY', targetPlan: { monthlyPrice: 49, currency: 'SAR' } })).toThrow();
    expect(() => planRequestQuote({ quotedAmount: -1, targetPlan: { monthlyPrice: 49, currency: 'SAR' } })).toThrow();
  });
});
