import { describe, expect, it } from 'vitest';
import { placeOrderSchema } from './storefront.schemas';

const base = {
  customerName: 'Customer',
  customerPhone: '0912000000',
  items: [{ productId: 'product_1', quantity: 1 }],
  deliveryMethod: 'PICKUP' as const,
};

describe('storefront checkout payment validation', () => {
  it('keeps cash as the backwards-compatible default', () => {
    expect(placeOrderSchema.parse(base).paymentMethod).toBe('CASH');
  });

  it('requires a merchant account and reference for manual transfer', () => {
    expect(() => placeOrderSchema.parse({ ...base, paymentMethod: 'MANUAL_TRANSFER' })).toThrow('Payment account and transaction reference are required');
  });

  it('accepts a complete manual transfer submission', () => {
    expect(placeOrderSchema.parse({ ...base, paymentMethod: 'MANUAL_TRANSFER', paymentAccountId: 'account_1', transactionRef: 'REF-123' })).toMatchObject({ paymentMethod: 'MANUAL_TRANSFER', transactionRef: 'REF-123' });
  });
});
