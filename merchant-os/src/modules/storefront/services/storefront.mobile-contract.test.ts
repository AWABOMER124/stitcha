import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listActiveMerchants: vi.fn(),
}));

vi.mock('../repositories/storefront.repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories/storefront.repository')>();
  return {
    ...actual,
    listActiveMerchants: mocks.listActiveMerchants,
  };
});

import { listStoresForApp } from './storefront.service';

describe('mobile storefront contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not invent delivery pricing, delivery timing, or ratings', async () => {
    mocks.listActiveMerchants.mockResolvedValue([
      {
        id: 'merchant-1',
        name: 'Test Store',
        logo: null,
        coverImage: null,
        businessType: 'RETAIL',
        isFeatured: true,
      },
    ]);

    await expect(listStoresForApp()).resolves.toEqual([
      expect.objectContaining({
        id: 'merchant-1',
        rating: null,
        deliveryTime: null,
        deliveryFee: null,
      }),
    ]);
  });
});
