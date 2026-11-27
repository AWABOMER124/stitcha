import { describe, expect, it } from 'vitest';
import { DEFAULT_SALES_SETTINGS, salesSettingsSchema, quoteInputSchema, checkoutInputSchema, priceQuote, quoteState, renderSalesMessage } from './policy';

describe('assisted sales policy', () => {
  it('validates recipient details and requires paired finite delivery coordinates', () => {
    expect(checkoutInputSchema.parse({ customerName: ' محمد أحمد ', customerPhone: '+966 500-000-000', lat: 24.7, lng: 46.6 })).toMatchObject({ customerName: 'محمد أحمد', customerPhone: '+966500000000', lat: 24.7, lng: 46.6 });
    for (const value of [{ lat: 24.7 }, { lng: 46.6 }, { lat: 91, lng: 46.6 }, { lat: 24.7, lng: Infinity }, { customerPhone: '123' }]) expect(checkoutInputSchema.safeParse(value).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ city: 'الرياض', district: 'النرجس', address: 'شارع تجريبي' }).success).toBe(true);
  });
  const line = { productId: 'cm00000000000000000000001', name: 'منتج', sku: null, quantity: 2, unitPrice: 300, listPrice: 350, total: 600 };
  it('uses the negotiated price and adds shipping exactly once', () => {
    expect(priceQuote([line], 25)).toEqual({ subtotal: 600, total: 625, discountPercent: 14.29 });
    expect(priceQuote([{ ...line, unitPrice: 0.1, quantity: 3 }], 0.2).total).toBe(0.5);
  });
  it('cannot hide a line discount behind another inflated line', () => {
    expect(priceQuote([{ ...line, unitPrice: 175 }, { ...line, unitPrice: 700 }], 0).discountPercent).toBe(50);
  });
  it('rejects zero totals, fractional minor units and repeated product lines', () => {
    expect(() => priceQuote([{ ...line, unitPrice: 0 }], 0)).toThrow();
    const input = { customerName: 'عميل', customerPhone: '+966500000000', items: [line], deliveryFee: 25, expiryHours: 48, paymentMethod: 'ONLINE', deliveryMethod: 'MERCHANT_DELIVERY' };
    expect(quoteInputSchema.safeParse(input).success).toBe(true);
    expect(quoteInputSchema.safeParse({ ...input, items: [line, line] }).success).toBe(false);
    expect(quoteInputSchema.safeParse({ ...input, deliveryFee: 0.001 }).success).toBe(false);
  });
  it('requires a payment link in the customizable message', () => {
    expect(salesSettingsSchema.safeParse({ whatsappTemplate: 'مرحبًا' }).success).toBe(false);
    expect(DEFAULT_SALES_SETTINGS.staffDiscountPercent).toBe(10);
    expect(renderSalesMessage('{customer} {link}', { customer: '$&', link: 'https://example.test/q', store: '', total: '', currency: '' })).toBe('$& https://example.test/q');
  });
  it('expires only unconverted offers and derives paid state from payment', () => {
    const quote = { status: 'OPEN', expiresAt: '2026-01-01' };
    expect(quoteState(quote, new Date('2026-02-01'))).toBe('EXPIRED');
    expect(quoteState({ ...quote, order: { status: 'NEW', payment: { status: 'PENDING' } } })).toBe('CONVERTED');
    expect(quoteState({ ...quote, order: { status: 'NEW', payment: { status: 'COMPLETED' } } })).toBe('PAID');
    expect(quoteState({ ...quote, order: { status: 'CANCELLED', payment: { status: 'COMPLETED' } } })).toBe('CANCELLED');
  });
});
