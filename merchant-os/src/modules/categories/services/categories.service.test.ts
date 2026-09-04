import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  $queryRaw: vi.fn(),
  category: { count: vi.fn(), create: vi.fn() },
};
const prismaMock = {
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock)),
  product: { count: vi.fn() },
};
const findBySlug = vi.fn();
const getMerchantPlanSnapshot = vi.fn();

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('../repositories/categories.repository', () => ({
  findBySlug,
  findAll: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
}));
vi.mock('@/modules/merchant-subscriptions', () => ({ getMerchantPlanSnapshot }));

const { createCategory } = await import('./categories.service');

describe('category plan limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findBySlug.mockResolvedValue(null);
    getMerchantPlanSnapshot.mockResolvedValue({ entitlements: { maxCategories: 10 } });
  });

  it('creates a category while the merchant is below the plan limit', async () => {
    txMock.category.count.mockResolvedValue(9);
    txMock.category.create.mockResolvedValue({ id: 'category_1', name: 'Coffee' });

    await expect(createCategory('merchant_1', { name: 'Coffee', isActive: true, sortOrder: 0 }))
      .resolves.toMatchObject({ id: 'category_1' });
    expect(txMock.$queryRaw).toHaveBeenCalledOnce();
    expect(txMock.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ merchantId: 'merchant_1', name: 'Coffee', slug: 'coffee' }),
    });
  });

  it('blocks creation after the Basic category limit is reached', async () => {
    txMock.category.count.mockResolvedValue(10);

    await expect(createCategory('merchant_1', { name: 'Coffee', isActive: true, sortOrder: 0 }))
      .rejects.toThrow('الحد الأقصى للتصنيفات (10)');
    expect(txMock.category.create).not.toHaveBeenCalled();
  });
});
