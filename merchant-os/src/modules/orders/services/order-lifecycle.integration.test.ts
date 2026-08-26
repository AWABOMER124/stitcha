import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { createOrder, updateOrderStatus } from './orders.service';
import { getOrderHistoryForAccount, placeOrderForAccount } from '@/modules/storefront/services/storefront.service';
import { enqueueJob, processOutboxBatch } from '@/services/jobs/outbox.service';
import { notificationJobHandlers } from '@/services/jobs/notification.jobs';

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
      const orderIds = await prisma.order.findMany({
        where: { merchantId },
        select: { id: true },
      });
      await prisma.outboxJob.deleteMany({
        where: {
          idempotencyKey: {
            in: [
              ...orderIds.map((order) => `order:new:${order.id}`),
              `e2e:retry:${suffix}`,
              `e2e:concurrent:${suffix}`,
              `e2e:dead:${suffix}`,
              `e2e:stale-final:${suffix}`,
            ],
          },
        },
      });
      await prisma.merchant.deleteMany({ where: { id: merchantId } });
    }
    if (accountId) {
      await prisma.customerAccount.deleteMany({ where: { id: accountId } });
    }
    await prisma.$disconnect();
  });

  it('applies the settlement-period uniqueness migration', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'settlements'
        AND indexname = 'settlements_merchantId_periodFrom_periodTo_key'
    `;

    expect(indexes).toEqual([
      { indexname: 'settlements_merchantId_periodFrom_periodTo_key' },
    ]);
  });

  it('seeds the direct merchant Basic and Pro plans', async () => {
    const plans = await prisma.merchantPlan.findMany({
      where: { code: { in: ['FREE', 'PRO'] } },
      orderBy: { sortOrder: 'asc' },
    });
    expect(plans).toHaveLength(2);
    expect(plans.map((plan) => ({ code: plan.code, price: Number(plan.monthlyPrice) })))
      .toEqual([{ code: 'FREE', price: 0 }, { code: 'PRO', price: 10 }]);
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

    const account = await prisma.customerAccount.findUniqueOrThrow({ where: { id: accountId } });
    const mobileOrder = await placeOrderForAccount(account, {
      items: [{ productId, quantity: 3 }],
      address: 'Mobile E2E address',
      paymentMethod: 'cash',
    });
    expect(mobileOrder).toMatchObject({ status: 'pending', totalAmount: 375 });

    const persistedMobileOrder = await prisma.order.findUniqueOrThrow({
      where: { id: mobileOrder.id },
      include: { delivery: true, payment: true },
    });
    expect(persistedMobileOrder.delivery).toMatchObject({
      type: 'MERCHANT_DELIVERY',
      address: 'Mobile E2E address',
    });
    expect(persistedMobileOrder.payment?.method).toBe('CASH');
    expect(Number(persistedMobileOrder.payment?.amount)).toBe(375);
    await expect(prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))
      .resolves.toMatchObject({ quantity: 5 });

    await updateOrderStatus(merchantId, mobileOrder.id, 'CANCELLED', 'Customer cancelled');
    await expect(prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))
      .resolves.toMatchObject({ quantity: 8 });

    const concurrentOrders = await Promise.allSettled([
      createOrder(merchantId, {
        customerId,
        items: [{ productId, quantity: 6 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'CASH',
      }),
      createOrder(merchantId, {
        customerId,
        items: [{ productId, quantity: 6 }],
        deliveryMethod: 'PICKUP',
        paymentMethod: 'CASH',
      }),
    ]);
    expect(concurrentOrders.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(concurrentOrders.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rejectedOrder = concurrentOrders.find((result) => result.status === 'rejected');
    expect(rejectedOrder?.reason).toBeInstanceOf(BusinessRuleError);
    await expect(prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))
      .resolves.toMatchObject({ quantity: 2 });

    const raceOrder = await createOrder(merchantId, {
      customerId,
      items: [{ productId, quantity: 1 }],
      deliveryMethod: 'PICKUP',
      paymentMethod: 'CASH',
    });
    const statusRace = await Promise.allSettled([
      updateOrderStatus(merchantId, raceOrder.id, 'ACCEPTED'),
      updateOrderStatus(merchantId, raceOrder.id, 'ACCEPTED'),
    ]);
    expect(statusRace.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(statusRace.filter((result) => result.status === 'rejected')).toHaveLength(1);

    await updateOrderStatus(merchantId, raceOrder.id, 'CANCELLED');
    await expect(prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }))
      .resolves.toMatchObject({ quantity: 2 });
  });

  it('claims durable jobs once, retries failures, and exposes dead letters', async () => {
    const retryTopic = `test.retry.${suffix}`;
    let retryDeliveries = 0;
    const retryHandlers = new Map([
      ...notificationJobHandlers,
      [retryTopic, async () => {
        retryDeliveries += 1;
        if (retryDeliveries === 1) throw new Error('temporary failure');
      }],
    ]);
    await enqueueJob({
      topic: retryTopic,
      idempotencyKey: `e2e:retry:${suffix}`,
      payload: { test: true },
    });
    await enqueueJob({
      topic: retryTopic,
      idempotencyKey: `e2e:retry:${suffix}`,
      payload: { ignoredDuplicate: true },
    });

    await processOutboxBatch({
      workerId: `retry-1-${suffix}`,
      handlers: retryHandlers,
      retryBaseDelayMs: 0,
    });
    await processOutboxBatch({
      workerId: `retry-2-${suffix}`,
      handlers: retryHandlers,
      retryBaseDelayMs: 0,
    });
    await expect(prisma.outboxJob.findUniqueOrThrow({
      where: { idempotencyKey: `e2e:retry:${suffix}` },
    })).resolves.toMatchObject({ status: 'COMPLETED', attempts: 2 });

    const concurrentTopic = `test.concurrent.${suffix}`;
    let concurrentDeliveries = 0;
    const concurrentHandlers = new Map([
      ...notificationJobHandlers,
      [concurrentTopic, async () => {
        concurrentDeliveries += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }],
    ]);
    await enqueueJob({
      topic: concurrentTopic,
      idempotencyKey: `e2e:concurrent:${suffix}`,
      payload: { test: true },
    });
    await Promise.all([
      processOutboxBatch({ workerId: `race-a-${suffix}`, handlers: concurrentHandlers }),
      processOutboxBatch({ workerId: `race-b-${suffix}`, handlers: concurrentHandlers }),
    ]);
    expect(concurrentDeliveries).toBe(1);

    const deadTopic = `test.dead.${suffix}`;
    const deadHandlers = new Map([
      ...notificationJobHandlers,
      [deadTopic, async () => { throw new Error('permanent\nprovider failure'); }],
    ]);
    await enqueueJob({
      topic: deadTopic,
      idempotencyKey: `e2e:dead:${suffix}`,
      payload: { test: true },
      maxAttempts: 2,
    });
    await processOutboxBatch({
      workerId: `dead-1-${suffix}`,
      handlers: deadHandlers,
      retryBaseDelayMs: 0,
    });
    await processOutboxBatch({
      workerId: `dead-2-${suffix}`,
      handlers: deadHandlers,
      retryBaseDelayMs: 0,
    });
    await expect(prisma.outboxJob.findUniqueOrThrow({
      where: { idempotencyKey: `e2e:dead:${suffix}` },
    })).resolves.toMatchObject({
      status: 'FAILED',
      attempts: 2,
      lastError: 'permanent provider failure',
    });

    const stale = await enqueueJob({
      topic: `test.stale.${suffix}`,
      idempotencyKey: `e2e:stale-final:${suffix}`,
      payload: { test: true },
      maxAttempts: 1,
    });
    await prisma.outboxJob.update({
      where: { id: stale.id },
      data: {
        status: 'PROCESSING',
        attempts: 1,
        lockedBy: 'crashed-worker',
        lockedAt: new Date(Date.now() - 60_000),
      },
    });
    await processOutboxBatch({
      workerId: `recovery-${suffix}`,
      handlers: notificationJobHandlers,
      lockTimeoutMs: 1_000,
    });
    await expect(prisma.outboxJob.findUniqueOrThrow({ where: { id: stale.id } }))
      .resolves.toMatchObject({
        status: 'FAILED',
        attempts: 1,
        lockedBy: null,
        lastError: 'Worker lock expired after final attempt',
      });
  });
});
