import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError } from '@/lib/errors';

const prismaMock = {
  deliveryProviderConfig: { findUnique: vi.fn() },
  order: { findUniqueOrThrow: vi.fn() },
  delivery: { update: vi.fn(), findFirst: vi.fn() },
};

const registryMock = { getAdapter: vi.fn() };
const cryptoMock = { decryptSecret: vi.fn() };
const ordersServiceMock = { updateOrderStatus: vi.fn() };

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('../registry', () => registryMock);
vi.mock('@/lib/crypto/secret', () => cryptoMock);
vi.mock('@/modules/orders/services/orders.service', () => ordersServiceMock);

const { createShipmentForOrder, handleProviderWebhook } = await import('./delivery-integrations.service');

function resetMocks() {
  prismaMock.deliveryProviderConfig.findUnique.mockReset();
  prismaMock.order.findUniqueOrThrow.mockReset();
  prismaMock.delivery.update.mockReset();
  prismaMock.delivery.findFirst.mockReset();
  registryMock.getAdapter.mockReset();
  cryptoMock.decryptSecret.mockReset().mockReturnValue('decrypted-secret');
  ordersServiceMock.updateOrderStatus.mockReset();
}

const fakeOrder = {
  id: 'order_1',
  orderNumber: 'ORD-1',
  total: 60,
  customerName: 'Zubair',
  customerPhone: '0911111111',
  customerAddress: 'Omdurman',
  merchant: { name: 'Merchant', phone: '0900000000', address: 'HQ', currency: 'SDG' },
  branch: { name: 'Main Branch', address: 'Branch Address', phone: '0900000001', lat: 15.5, lng: 32.5 },
};

describe('createShipmentForOrder', () => {
  beforeEach(resetMocks);

  it('returns null when the company has no provider config', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue(null);
    const result = await createShipmentForOrder('company_1', 'order_1');
    expect(result).toBeNull();
    expect(registryMock.getAdapter).not.toHaveBeenCalled();
  });

  it('returns null when the config is inactive', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG', isActive: false });
    const result = await createShipmentForOrder('company_1', 'order_1');
    expect(result).toBeNull();
  });

  it('returns null when the providerKey has no registered adapter', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'UNKNOWN', isActive: true });
    registryMock.getAdapter.mockReturnValue(null);
    const result = await createShipmentForOrder('company_1', 'order_1');
    expect(result).toBeNull();
  });

  it('creates a shipment and stores the provider reference on Delivery', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({
      providerKey: 'MANUAL_LOG', isActive: true, apiBaseUrl: null, credentials: null,
    });
    const createShipment = vi.fn().mockResolvedValue({ providerReference: 'LOG-XYZ' });
    registryMock.getAdapter.mockReturnValue({ createShipment });
    prismaMock.order.findUniqueOrThrow.mockResolvedValue(fakeOrder);
    prismaMock.delivery.update.mockResolvedValue({});

    const result = await createShipmentForOrder('company_1', 'order_1');

    expect(result).toEqual({ providerReference: 'LOG-XYZ' });
    expect(createShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order_1',
        orderNumber: 'ORD-1',
        codAmount: 60,
        currency: 'SDG',
        pickup: expect.objectContaining({ name: 'Main Branch' }),
        dropoff: expect.objectContaining({ name: 'Zubair', address: 'Omdurman' }),
      }),
      expect.anything()
    );
    expect(prismaMock.delivery.update).toHaveBeenCalledWith({
      where: { orderId: 'order_1' },
      data: { providerReference: 'LOG-XYZ' },
    });
  });

  it('falls back to the merchant address when the order has no branch', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({
      providerKey: 'MANUAL_LOG', isActive: true, apiBaseUrl: null, credentials: null,
    });
    const createShipment = vi.fn().mockResolvedValue({ providerReference: 'LOG-XYZ' });
    registryMock.getAdapter.mockReturnValue({ createShipment });
    prismaMock.order.findUniqueOrThrow.mockResolvedValue({ ...fakeOrder, branch: null });
    prismaMock.delivery.update.mockResolvedValue({});

    await createShipmentForOrder('company_1', 'order_1');

    expect(createShipment).toHaveBeenCalledWith(
      expect.objectContaining({ pickup: expect.objectContaining({ name: 'Merchant', address: 'HQ' }) }),
      expect.anything()
    );
  });

  it('decrypts stored credentials before handing them to the adapter', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({
      providerKey: 'MANUAL_LOG', isActive: true, apiBaseUrl: 'https://provider.example', credentials: 'iv:tag:ct',
    });
    const createShipment = vi.fn().mockResolvedValue({ providerReference: 'LOG-XYZ' });
    registryMock.getAdapter.mockReturnValue({ createShipment });
    prismaMock.order.findUniqueOrThrow.mockResolvedValue(fakeOrder);
    prismaMock.delivery.update.mockResolvedValue({});

    await createShipmentForOrder('company_1', 'order_1');

    expect(cryptoMock.decryptSecret).toHaveBeenCalledWith('iv:tag:ct');
    expect(createShipment).toHaveBeenCalledWith(expect.anything(), { apiBaseUrl: 'https://provider.example', secret: 'decrypted-secret' });
  });
});

describe('handleProviderWebhook', () => {
  beforeEach(resetMocks);

  it('throws NotFoundError for an unknown webhook token', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue(null);
    await expect(handleProviderWebhook('bad-token', '{}', {})).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the config points at an unregistered adapter', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'UNKNOWN' });
    registryMock.getAdapter.mockReturnValue(null);
    await expect(handleProviderWebhook('token', '{}', {})).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when the adapter rejects the payload', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({ parseWebhookEvent: vi.fn().mockReturnValue(null) });
    await expect(handleProviderWebhook('token', 'garbage', {})).rejects.toThrow(ValidationError);
  });

  it('silently ignores an event for an unknown provider reference', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-GHOST', status: 'DELIVERED' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue(null);

    await expect(handleProviderWebhook('token', '{}', {})).resolves.toBeUndefined();
    expect(prismaMock.delivery.update).not.toHaveBeenCalled();
  });

  it('updates Delivery.status and deliveredAt, and mirrors DELIVERED onto the order', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-XYZ', status: 'DELIVERED', note: 'left at door' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue({
      id: 'delivery_1', orderId: 'order_1', order: { merchantId: 'merchant_1', status: 'OUT_FOR_DELIVERY' },
    });
    prismaMock.delivery.update.mockResolvedValue({});

    await handleProviderWebhook('token', '{}', {});

    expect(prismaMock.delivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery_1' },
      data: { status: 'DELIVERED', deliveredAt: expect.any(Date), notes: 'left at door' },
    });
    expect(ordersServiceMock.updateOrderStatus).toHaveBeenCalledWith('merchant_1', 'order_1', 'DELIVERED', 'Delivery provider update: DELIVERED');
  });

  it('maps PICKED_UP/IN_TRANSIT to OUT_FOR_DELIVERY on the order', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-XYZ', status: 'PICKED_UP' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue({
      id: 'delivery_1', orderId: 'order_1', order: { merchantId: 'merchant_1', status: 'READY' },
    });
    prismaMock.delivery.update.mockResolvedValue({});

    await handleProviderWebhook('token', '{}', {});

    expect(ordersServiceMock.updateOrderStatus).toHaveBeenCalledWith('merchant_1', 'order_1', 'OUT_FOR_DELIVERY', 'Delivery provider update: PICKED_UP');
  });

  it('does not touch the order when it already matches the mirrored status', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-XYZ', status: 'DELIVERED' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue({
      id: 'delivery_1', orderId: 'order_1', order: { merchantId: 'merchant_1', status: 'DELIVERED' },
    });
    prismaMock.delivery.update.mockResolvedValue({});

    await handleProviderWebhook('token', '{}', {});

    expect(ordersServiceMock.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('does not throw the webhook if mirroring onto the order fails (best-effort)', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-XYZ', status: 'DELIVERED' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue({
      id: 'delivery_1', orderId: 'order_1', order: { merchantId: 'merchant_1', status: 'OUT_FOR_DELIVERY' },
    });
    prismaMock.delivery.update.mockResolvedValue({});
    ordersServiceMock.updateOrderStatus.mockRejectedValue(new Error('invalid transition'));

    await expect(handleProviderWebhook('token', '{}', {})).resolves.toBeUndefined();
  });

  it('leaves FAILED as Delivery-only, with no order status mirroring', async () => {
    prismaMock.deliveryProviderConfig.findUnique.mockResolvedValue({ providerKey: 'MANUAL_LOG' });
    registryMock.getAdapter.mockReturnValue({
      parseWebhookEvent: vi.fn().mockReturnValue({ providerReference: 'LOG-XYZ', status: 'FAILED' }),
    });
    prismaMock.delivery.findFirst.mockResolvedValue({
      id: 'delivery_1', orderId: 'order_1', order: { merchantId: 'merchant_1', status: 'OUT_FOR_DELIVERY' },
    });
    prismaMock.delivery.update.mockResolvedValue({});

    await handleProviderWebhook('token', '{}', {});

    expect(prismaMock.delivery.update).toHaveBeenCalledWith({ where: { id: 'delivery_1' }, data: { status: 'FAILED' } });
    expect(ordersServiceMock.updateOrderStatus).not.toHaveBeenCalled();
  });
});
