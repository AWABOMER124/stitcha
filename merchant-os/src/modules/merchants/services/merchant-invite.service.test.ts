import { describe, it, expect, vi, beforeEach } from 'vitest';

const txMock = {
  merchant: { create: vi.fn() },
  branch: { create: vi.fn() },
  storefrontSettings: { create: vi.fn() },
  category: { create: vi.fn() },
  product: { create: vi.fn() },
  inventoryItem: { create: vi.fn() },
};

const prismaMock = {
  $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
};

const enqueueExternalNotificationMock = vi.fn();
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/services/jobs/notification.jobs', () => ({
  enqueueExternalNotification: enqueueExternalNotificationMock,
}));

const { createPendingMerchantWithInvite } = await import('./merchant-invite.service');

function resetMocks() {
  Object.values(txMock).forEach((model) => Object.values(model).forEach((fn) => fn.mockReset()));
  prismaMock.$transaction.mockClear();
  enqueueExternalNotificationMock.mockReset().mockResolvedValue(undefined);
  txMock.merchant.create.mockResolvedValue({ id: 'merchant_1', slug: 'test-merchant-abc' });
  txMock.category.create.mockResolvedValue({ id: 'category_1' });
  txMock.product.create.mockResolvedValue({ id: 'product_1' });
}

describe('createPendingMerchantWithInvite', () => {
  beforeEach(resetMocks);

  it('creates a PENDING merchant, main branch, and storefront settings', async () => {
    const result = await createPendingMerchantWithInvite({
      name: 'متجر تجريبي', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1',
    });

    expect(result).toEqual({ id: 'merchant_1', slug: 'test-merchant-abc' });
    expect(txMock.merchant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING', businessType: 'OTHER', distributorId: 'dist_1', phone: '0911111111', address: 'الخرطوم',
        }),
      })
    );
    expect(txMock.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ merchantId: 'merchant_1', isMain: true, name: 'Main Branch' }) })
    );
    expect(txMock.storefrontSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ merchantId: 'merchant_1' }) })
    );
  });

  it('respects an explicit businessType instead of defaulting to OTHER', async () => {
    await createPendingMerchantWithInvite({
      name: 'مطعم', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1', businessType: 'RESTAURANT',
    });
    expect(txMock.merchant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ businessType: 'RESTAURANT' }) })
    );
  });

  it('seeds theme and welcomeText into storefront settings when provided', async () => {
    await createPendingMerchantWithInvite({
      name: 'متجر', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1',
      seedTheme: { primaryColor: '#ff0000', welcomeText: 'أهلاً بكم' },
    });
    expect(txMock.storefrontSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ theme: { primaryColor: '#ff0000' }, welcomeText: 'أهلاً بكم' }),
      })
    );
  });

  it('creates seeded categories, products, and an inventory item per product', async () => {
    await createPendingMerchantWithInvite({
      name: 'متجر', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1',
      seedCategories: [{ name: 'مشروبات', products: [{ name: 'قهوة', price: 15, description: 'ساخنة' }] }],
    });

    expect(txMock.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ merchantId: 'merchant_1', name: 'مشروبات' }) })
    );
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryId: 'category_1', name: 'قهوة', price: 15 }) })
    );
    expect(txMock.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 'product_1', merchantId: 'merchant_1', quantity: 0 }) })
    );
  });

  it('clamps a non-positive seeded price to a minimum of 1', async () => {
    await createPendingMerchantWithInvite({
      name: 'متجر', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1',
      seedCategories: [{ name: 'فئة', products: [{ name: 'منتج مجاني', price: 0 }] }],
    });
    expect(txMock.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ price: 1 }) }));
  });

  it('queues a WhatsApp registration link best-effort and does not throw if queuing fails', async () => {
    enqueueExternalNotificationMock.mockRejectedValue(new Error('outbox down'));
    await expect(
      createPendingMerchantWithInvite({ name: 'متجر', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1' })
    ).resolves.toEqual({ id: 'merchant_1', slug: 'test-merchant-abc' });
    expect(enqueueExternalNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: '0911111111', channel: 'WHATSAPP' }),
      expect.stringMatching(/^merchant-invite:merchant_1:/),
    );
  });

  it('creates no categories/products when none are seeded', async () => {
    await createPendingMerchantWithInvite({ name: 'متجر', phone: '0911111111', address: 'الخرطوم', distributorId: 'dist_1' });
    expect(txMock.category.create).not.toHaveBeenCalled();
    expect(txMock.product.create).not.toHaveBeenCalled();
  });
});
