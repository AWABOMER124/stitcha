import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { createOrder, updateOrderStatus } from './orders.service';
import { getOrderHistoryForAccount } from '@/modules/storefront/services/storefront.service';

describe('database-backed order lifecycle', () => {
  const suffix = randomUUID();
  const merchantSlug = `e2e-merchant-${suffix}`;
  const accountPhone = `e2e-${suffix}`;

  let merchantId: string;
  let accountId: string;
  let customerId: string;
  let productId: string;
  let inventoryItemId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchant.create({
      data: {
        name: 'E2E Merchant',
        slug: merchantSlug,
        businessType: 'RETAIL',
        status: 'ACTIVE',
        isActive: true,
      },
    });
    merchantId = merchant.id;

    const account = await prisma.customerAccount.create({
      data: {
        name: 'E2E Customer',
        phone: accountPhone,
        passwordHash: 'not-a-real-password-hash',
      },
    });
    accountId = account.id;

    const customer = await prisma.customer.create({
      data: {
        merchantId,
        accountId,
        name: account.name,
        phone: account.phone,
      },
    });
    customerId = customer.id;

    const category = await prisma.category.create({
      data: {
        merchantId,
        name: 'E2E Category',
        slug: `e2e-category-${suffix}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        merchantId,
        categoryId: category.id,
        name: 'E2E Product',
        slug: `e2e-product-${suffix}`,
        price: 125,
      },
    });
    productId = product.id;

    const inventory = await prisma.inventoryItem.create({
      data: {
        merchantId,
        productId,
        quantity: 10,
        trackInventory: true,
      },
    });
    inventoryItemId = inventory.id;
  });

  afterAll(async () => {
    if (merchantId) {
      await prisma.merchant.deleteMany({ where: { id: merchantId } });
    }
    if (accountId) {
      await prisma.customerAccount.deleteMany({ where: { id: accountId } });
    }
    await prisma.$disconnect();
  });

  it('creates, fulfills, audits, and archives a real order', async () => {
    const created = await createOrder(merchantId, {
      customerId,
      items: [{ productId, quantity: 2 }],
      deliveryMethod: 'MERCHANT_DELIVERY',
      paymentMethod: 'CASH',
      customerAddress: 'E2E delivery address',
    });

    expect(created).toMatchObject({
      status: 'NEW',
      subtotal: 250,
      deliveryFee: 0,
      total: 250,
    });
    expect(created.delivery).toMatchObject({
      type: 'MERCHANT_DELIVERY',
      status: 'PENDING',
      address: 'E2E delivery address',
    });
    expect(created.payment).toMatchObject({
      method: 'CASH',
      status: 'PENDING',
      amount: 250,
    });

    await expect(prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))
      .resolves.toMatchObject({ quantity: 8 });

    const initialHistory = await getOrderHistoryForAccount(accountId);
    expect(initialHistory).toEqual([
      expect.objectContaining({ id: created.id, status: 'pending', totalAmount: 250 }),
    ]);

    for (const status of ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
      await updateOrderStatus(merchantId, created.id, status, `E2E transition to ${status}`);
    }

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
        delivery: true,
      },
    });
    expect(persisted.status).toBe('DELIVERED');
    expect(persisted.completedAt).not.toBeNull();
    expect(persisted.statusHistory.map((entry) => entry.status)).toEqual([
      'NEW',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);

    const completedHistory = await getOrderHistoryForAccount(accountId);
    expect(completedHistory[0]).toMatchObject({ id: created.id, status: 'completed' });

    await expect(updateOrderStatus(merchantId, created.id, 'CANCELLED'))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });
});
