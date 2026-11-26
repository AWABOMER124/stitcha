import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/db/prisma';
import { checkoutQuote, saveQuote } from './service';

if (!process.env.DATABASE_URL || !/\/(?:wasla_[a-z_]*test|wasla_test)(?:\?|$)/.test(process.env.DATABASE_URL)) {
  throw new Error('Assisted sales integration requires an isolated wasla_*test database');
}
vi.mock('@/modules/paymob-payments/market-payments.service', () => ({
  getMerchantOnlinePaymentStatus: vi.fn().mockResolvedValue({ ready: true }),
  createMarketOrderCheckout: vi.fn().mockResolvedValue({ checkoutUrl: 'https://synthetic.example/checkout' }),
}));

describe('database-backed assisted checkout', () => {
  const suffix = randomUUID();
  let merchantId: string, userId: string, planId: string, productId: string, inventoryId: string;
  const auth = () => ({ merchantId, userId, role: 'MERCHANT_OWNER', permissions: [] });
  const address = { city: 'الرياض', district: 'النرجس', address: 'عنوان تجريبي معزول مبنى ١' };
  beforeAll(async () => {
    const merchant = await prisma.merchant.create({ data: { name: 'Synthetic sales store', slug: `sales-${suffix}`, businessType: 'RETAIL', subscriptionMarket: 'SA', currency: 'SAR', status: 'ACTIVE' } });
    merchantId = merchant.id;
    const user = await prisma.user.create({ data: { email: `sales-${suffix}@example.test`, role: 'MERCHANT_OWNER', merchantUsers: { create: { merchantId, role: 'MERCHANT_OWNER', isOwner: true } } } });
    userId = user.id;
    const plan = await prisma.merchantPlan.create({ data: { code: `TEST_SALES_${suffix}`, name: 'Synthetic Business', entitlements: { assistedSales: true }, isPublic: false } });
    planId = plan.id;
    await prisma.merchantSubscription.create({ data: { merchantId, planId, status: 'ACTIVE' } });
    const category = await prisma.category.create({ data: { merchantId, name: 'Synthetic', slug: `sales-${suffix}` } });
    const product = await prisma.product.create({ data: { merchantId, categoryId: category.id, name: 'Synthetic product', slug: `sales-${suffix}`, price: 350 } });
    productId = product.id;
    const inventory = await prisma.inventoryItem.create({ data: { merchantId, productId, quantity: 20, trackInventory: true } });
    inventoryId = inventory.id;
  });
  afterAll(async () => {
    if (merchantId) {
      // Orders restrict deletion from linked quotes: remove only this synthetic fixture, in dependency order.
      await prisma.salesQuote.deleteMany({ where: { merchantId } });
      await prisma.order.deleteMany({ where: { merchantId } });
      await prisma.merchant.delete({ where: { id: merchantId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (planId) await prisma.merchantPlan.delete({ where: { id: planId } });
  });
  async function offer() {
    const result = await saveQuote(auth(), { customerName: 'Synthetic customer', customerPhone: '+966500000000', items: [{ productId, quantity: 2, unitPrice: 300 }], deliveryFee: 25,
      paymentMethod: 'ONLINE', deliveryMethod: 'MERCHANT_DELIVERY', expiryHours: 48 });
    return prisma.salesQuote.findUniqueOrThrow({ where: { id: result.id } });
  }
  it('serializes simultaneous submissions into one order and one stock deduction', async () => {
    const quote = await offer();
    const before = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryId } });
    await Promise.all([checkoutQuote(quote.token, address, 'https://synthetic.example'), checkoutQuote(quote.token, address, 'https://synthetic.example')]);
    const updated = await prisma.salesQuote.findUniqueOrThrow({ where: { id: quote.id }, include: { order: { include: { payment: true, items: true } } } });
    expect(updated.order?.total.toString()).toBe('625');
    expect(updated.order?.payment?.amount.toString()).toBe('625');
    expect(updated.order?.items[0].unitPrice.toString()).toBe('300');
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryId } })).quantity).toBe(before.quantity - 2);
    expect(await prisma.order.count({ where: { merchantId } })).toBe(1);
    await expect(prisma.order.update({ where: { id: updated.orderId! }, data: { total: 1 } })).rejects.toThrow('ASSISTED_SALE_AMOUNT_LOCKED');
  });
  it('invalidates the previous token on revision', async () => {
    const quote = await offer();
    await saveQuote(auth(), { customerName: quote.customerName, customerPhone: quote.customerPhone, items: [{ productId, quantity: 1, unitPrice: 320 }], deliveryFee: 25,
      paymentMethod: 'ONLINE', deliveryMethod: 'MERCHANT_DELIVERY', expiryHours: 48 }, quote.id, quote.version);
    await expect(checkoutQuote(quote.token, address, 'https://synthetic.example')).rejects.toThrow();
  });
  it('rejects expired offers without changing stock', async () => {
    const quote = await offer();
    await prisma.salesQuote.update({ where: { id: quote.id }, data: { expiresAt: new Date(0) } });
    const before = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryId } });
    await expect(checkoutQuote(quote.token, address, 'https://synthetic.example')).rejects.toThrow('صلاحيته');
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryId } })).quantity).toBe(before.quantity);
  });
});
