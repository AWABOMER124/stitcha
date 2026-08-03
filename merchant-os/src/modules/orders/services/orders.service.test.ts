import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessRuleError, ValidationError, NotFoundError } from '@/lib/errors';

const prismaMock = {
  customer: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  product: { findMany: vi.fn() },
  merchant: { findUnique: vi.fn() },
  deliveryZone: { findFirst: vi.fn() },
};

const ordersRepoMock = {
  create: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
};

const inventoryServiceMock = {
  deductForOrder: vi.fn(),
  restoreForCancellation: vi.fn(),
};

const customerSubscriptionsServiceMock = {
  hasActiveDeliveryPerk: vi.fn(),
};

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('../repositories/orders.repository', () => ordersRepoMock);
vi.mock('@/modules/inventory/services/inventory.service', () => inventoryServiceMock);
vi.mock('@/modules/customer-subscriptions/services/customer-subscriptions.service', () => customerSubscriptionsServiceMock);

const { createOrder, updateOrderStatus, getOrder } = await import('./orders.service');

function resetMocks() {
  prismaMock.customer.findFirst.mockReset();
  prismaMock.customer.create.mockReset();
  prismaMock.customer.findUnique.mockReset();
  prismaMock.product.findMany.mockReset();
  prismaMock.merchant.findUnique.mockReset();
  prismaMock.deliveryZone.findFirst.mockReset();
  customerSubscriptionsServiceMock.hasActiveDeliveryPerk.mockReset().mockResolvedValue(false);
  ordersRepoMock.create.mockReset();
  ordersRepoMock.findById.mockReset();
  ordersRepoMock.updateStatus.mockReset();
  inventoryServiceMock.deductForOrder.mockReset().mockResolvedValue([]);
  inventoryServiceMock.restoreForCancellation.mockReset().mockResolvedValue([]);
}

describe('orders.service', () => {
  beforeEach(resetMocks);

  describe('createOrder', () => {
    const baseInput = {
      customerName: 'Ahmed',
      customerPhone: '0911111111',
      deliveryMethod: 'PICKUP' as const,
      paymentMethod: 'CASH' as const,
      items: [{ productId: 'prod_1', quantity: 2 }],
    };

    it('reuses an existing customer by phone instead of creating a new one', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_existing' });
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null },
      ]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST1', id: 'order_1' });

      await createOrder('merchant_1', baseInput);

      expect(prismaMock.customer.create).not.toHaveBeenCalled();
      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.customerId).toBe('cust_existing');
    });

    it('creates a new customer when no phone match exists', async () => {
      prismaMock.customer.findFirst.mockResolvedValue(null);
      prismaMock.customer.create.mockResolvedValue({ id: 'cust_new' });
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null },
      ]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST2', id: 'order_2' });

      await createOrder('merchant_1', baseInput);

      expect(prismaMock.customer.create).toHaveBeenCalledTimes(1);
      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.customerId).toBe('cust_new');
    });

    it('rejects when neither customerId nor customerName+phone are provided', async () => {
      await expect(createOrder('merchant_1', { ...baseInput, customerName: undefined, customerPhone: undefined })).rejects.toThrow(
        ValidationError
      );
    });

    it('snapshots product price and name at order time, independent of later product changes', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'Burger', price: 250, images: ['img.png'], sku: 'SKU1' },
      ]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST3', id: 'order_3' });

      await createOrder('merchant_1', baseInput);

      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.items[0].productSnapshot).toEqual({
        name: 'Burger',
        price: 250,
        image: 'img.png',
        sku: 'SKU1',
      });
      expect(createCall.items[0].unitPrice).toBe(250);
      expect(createCall.items[0].total).toBe(500); // 250 * qty 2
      expect(createCall.subtotal).toBe(500);
    });

    it('adds modifier prices into the unit price and total', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null },
      ]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST4', id: 'order_4' });

      await createOrder('merchant_1', {
        ...baseInput,
        items: [{ productId: 'prod_1', quantity: 1, modifiers: [{ name: 'Extra cheese', option: 'Yes', price: 15 }] }],
      });

      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.items[0].unitPrice).toBe(115);
      expect(createCall.items[0].total).toBe(115);
    });

    it('rejects the order if any product is missing or inactive', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([]); // none found/active
      await expect(createOrder('merchant_1', baseInput)).rejects.toThrow(ValidationError);
      expect(ordersRepoMock.create).not.toHaveBeenCalled();
    });

    it('charges zero delivery fee for PICKUP regardless of delivery zones', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST5', id: 'order_5' });

      await createOrder('merchant_1', baseInput);

      expect(prismaMock.merchant.findUnique).not.toHaveBeenCalled();
      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.deliveryFee).toBe(0);
    });

    it('applies the distributor delivery zone base fee for non-pickup orders', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      prismaMock.merchant.findUnique.mockResolvedValue({ distributorId: 'dist_1' });
      prismaMock.deliveryZone.findFirst.mockResolvedValue({ baseFee: 25 });
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST6', id: 'order_6' });

      await createOrder('merchant_1', { ...baseInput, deliveryMethod: 'MERCHANT_DELIVERY' });

      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.deliveryFee).toBe(25);
      expect(createCall.total).toBe(225); // 200 subtotal + 25 delivery
    });

    it('waives the delivery fee for a customer with an active subscription delivery perk', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.customer.findUnique.mockResolvedValue({ accountId: 'account_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      prismaMock.merchant.findUnique.mockResolvedValue({ distributorId: 'dist_1' });
      prismaMock.deliveryZone.findFirst.mockResolvedValue({ baseFee: 25 });
      customerSubscriptionsServiceMock.hasActiveDeliveryPerk.mockResolvedValue(true);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST6B', id: 'order_6b' });

      await createOrder('merchant_1', { ...baseInput, deliveryMethod: 'MERCHANT_DELIVERY' });

      expect(customerSubscriptionsServiceMock.hasActiveDeliveryPerk).toHaveBeenCalledWith('account_1');
      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.deliveryFee).toBe(0);
      expect(createCall.total).toBe(200);
    });

    it('still charges the delivery fee for a linked customer with no active subscription', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.customer.findUnique.mockResolvedValue({ accountId: 'account_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      prismaMock.merchant.findUnique.mockResolvedValue({ distributorId: 'dist_1' });
      prismaMock.deliveryZone.findFirst.mockResolvedValue({ baseFee: 25 });
      customerSubscriptionsServiceMock.hasActiveDeliveryPerk.mockResolvedValue(false);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST6C', id: 'order_6c' });

      await createOrder('merchant_1', { ...baseInput, deliveryMethod: 'MERCHANT_DELIVERY' });

      const createCall = ordersRepoMock.create.mock.calls[0][1];
      expect(createCall.deliveryFee).toBe(25);
    });

    it('does not check for a subscription perk on PICKUP orders (no delivery fee to waive)', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST6D', id: 'order_6d' });

      await createOrder('merchant_1', baseInput); // baseInput uses PICKUP

      expect(customerSubscriptionsServiceMock.hasActiveDeliveryPerk).not.toHaveBeenCalled();
    });

    it('deducts inventory for the ordered items after the order is created', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST7', id: 'order_7' });

      await createOrder('merchant_1', baseInput);

      expect(inventoryServiceMock.deductForOrder).toHaveBeenCalledWith('merchant_1', [
        { productId: 'prod_1', quantity: 2 },
      ]);
    });

    it('does not fail order creation if inventory deduction throws (best-effort side effect)', async () => {
      prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust_1' });
      prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'Burger', price: 100, images: [], sku: null }]);
      ordersRepoMock.create.mockResolvedValue({ orderNumber: 'ORD-TEST8', id: 'order_8' });
      inventoryServiceMock.deductForOrder.mockRejectedValue(new Error('db down'));

      const result = await createOrder('merchant_1', baseInput);
      expect(result.orderNumber).toBe('ORD-TEST8');
    });
  });

  describe('updateOrderStatus — state machine', () => {
    const orderWithItems = (status: string) => ({
      id: 'order_1',
      status,
      orderNumber: 'ORD-SM1',
      items: [{ productId: 'prod_1', quantity: 3 }],
    });

    it.each([
      ['NEW', 'ACCEPTED'],
      ['NEW', 'REJECTED'],
      ['NEW', 'CANCELLED'],
      ['ACCEPTED', 'PREPARING'],
      ['ACCEPTED', 'CANCELLED'],
      ['PREPARING', 'READY'],
      ['READY', 'OUT_FOR_DELIVERY'],
      ['READY', 'DELIVERED'],
      ['OUT_FOR_DELIVERY', 'DELIVERED'],
    ])('allows %s -> %s', async (from, to) => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems(from));
      ordersRepoMock.updateStatus.mockResolvedValue({ ...orderWithItems(from), status: to });

      await expect(updateOrderStatus('merchant_1', 'order_1', to as never)).resolves.toBeTruthy();
      expect(ordersRepoMock.updateStatus).toHaveBeenCalledWith('merchant_1', 'order_1', to, undefined, undefined);
    });

    it.each([
      ['NEW', 'PREPARING'],
      ['NEW', 'DELIVERED'],
      ['ACCEPTED', 'READY'],
      ['ACCEPTED', 'REJECTED'],
      ['PREPARING', 'OUT_FOR_DELIVERY'],
      ['DELIVERED', 'CANCELLED'],
      ['CANCELLED', 'ACCEPTED'],
      ['REJECTED', 'ACCEPTED'],
    ])('rejects %s -> %s', async (from, to) => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems(from));

      await expect(updateOrderStatus('merchant_1', 'order_1', to as never)).rejects.toThrow(BusinessRuleError);
      expect(ordersRepoMock.updateStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for an order that does not exist (or belongs to another merchant)', async () => {
      ordersRepoMock.findById.mockResolvedValue(null);
      await expect(updateOrderStatus('merchant_1', 'nope', 'ACCEPTED' as never)).rejects.toThrow(NotFoundError);
    });

    it('restores inventory when an order transitions to CANCELLED', async () => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems('NEW'));
      ordersRepoMock.updateStatus.mockResolvedValue(orderWithItems('CANCELLED'));

      await updateOrderStatus('merchant_1', 'order_1', 'CANCELLED' as never);

      expect(inventoryServiceMock.restoreForCancellation).toHaveBeenCalledWith('merchant_1', [
        { productId: 'prod_1', quantity: 3 },
      ]);
    });

    it('restores inventory when an order transitions to REJECTED', async () => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems('NEW'));
      ordersRepoMock.updateStatus.mockResolvedValue(orderWithItems('REJECTED'));

      await updateOrderStatus('merchant_1', 'order_1', 'REJECTED' as never);

      expect(inventoryServiceMock.restoreForCancellation).toHaveBeenCalledTimes(1);
    });

    it('does not touch inventory for a non-terminal transition like ACCEPTED', async () => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems('NEW'));
      ordersRepoMock.updateStatus.mockResolvedValue(orderWithItems('ACCEPTED'));

      await updateOrderStatus('merchant_1', 'order_1', 'ACCEPTED' as never);

      expect(inventoryServiceMock.restoreForCancellation).not.toHaveBeenCalled();
    });

    it('does not fail the status update if inventory restoration throws (best-effort side effect)', async () => {
      ordersRepoMock.findById.mockResolvedValue(orderWithItems('NEW'));
      ordersRepoMock.updateStatus.mockResolvedValue(orderWithItems('CANCELLED'));
      inventoryServiceMock.restoreForCancellation.mockRejectedValue(new Error('db down'));

      await expect(updateOrderStatus('merchant_1', 'order_1', 'CANCELLED' as never)).resolves.toBeTruthy();
    });
  });

  describe('getOrder', () => {
    it('throws NotFoundError when the order is missing', async () => {
      ordersRepoMock.findById.mockResolvedValue(null);
      await expect(getOrder('merchant_1', 'missing')).rejects.toThrow(NotFoundError);
    });

    it('returns the order when found', async () => {
      ordersRepoMock.findById.mockResolvedValue({ id: 'order_1', status: 'NEW' });
      const order = await getOrder('merchant_1', 'order_1');
      expect(order.id).toBe('order_1');
    });
  });
});
