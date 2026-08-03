import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@/lib/errors';

const repoMock = {
  findMerchantForDistributor: vi.fn(),
  createPlacement: vi.fn(),
  listForDistributor: vi.fn(),
  deletePlacement: vi.fn(),
};

vi.mock('../repositories/featured-placements.repository', () => repoMock);

const { createFeaturedPlacement, listFeaturedPlacements, removeFeaturedPlacement } = await import('./featured-placements.service');

describe('featured-placements.service', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
  });

  describe('createFeaturedPlacement', () => {
    it('rejects a merchant that does not belong to the calling distributor', async () => {
      repoMock.findMerchantForDistributor.mockResolvedValue(null);
      await expect(
        createFeaturedPlacement('dist_1', { merchantId: 'merch_x', startsAt: new Date(), endsAt: new Date(), amount: 100 })
      ).rejects.toThrow(NotFoundError);
      expect(repoMock.createPlacement).not.toHaveBeenCalled();
    });

    it('creates a placement for a merchant that does belong to the distributor', async () => {
      repoMock.findMerchantForDistributor.mockResolvedValue({ id: 'merch_1', name: 'Burger House' });
      repoMock.createPlacement.mockResolvedValue({ id: 'placement_1' });

      const input = { merchantId: 'merch_1', startsAt: new Date(), endsAt: new Date(), amount: 250 };
      const result = await createFeaturedPlacement('dist_1', input);

      expect(repoMock.createPlacement).toHaveBeenCalledWith('dist_1', input);
      expect(result).toEqual({ id: 'placement_1' });
    });
  });

  describe('listFeaturedPlacements', () => {
    it('computes isActive for a currently-running placement', async () => {
      const now = new Date();
      repoMock.listForDistributor.mockResolvedValue([
        { id: 'p1', startsAt: new Date(now.getTime() - 86_400_000), endsAt: new Date(now.getTime() + 86_400_000) },
      ]);
      const result = await listFeaturedPlacements('dist_1');
      expect(result[0].isActive).toBe(true);
    });

    it('computes isActive=false for a future-scheduled placement', async () => {
      const now = new Date();
      repoMock.listForDistributor.mockResolvedValue([
        { id: 'p2', startsAt: new Date(now.getTime() + 86_400_000), endsAt: new Date(now.getTime() + 2 * 86_400_000) },
      ]);
      const result = await listFeaturedPlacements('dist_1');
      expect(result[0].isActive).toBe(false);
    });

    it('computes isActive=false for an expired placement', async () => {
      const now = new Date();
      repoMock.listForDistributor.mockResolvedValue([
        { id: 'p3', startsAt: new Date(now.getTime() - 2 * 86_400_000), endsAt: new Date(now.getTime() - 86_400_000) },
      ]);
      const result = await listFeaturedPlacements('dist_1');
      expect(result[0].isActive).toBe(false);
    });
  });

  describe('removeFeaturedPlacement', () => {
    it('throws NotFoundError when nothing was deleted (wrong distributor or unknown id)', async () => {
      repoMock.deletePlacement.mockResolvedValue({ count: 0 });
      await expect(removeFeaturedPlacement('p1', 'dist_1')).rejects.toThrow(NotFoundError);
    });

    it('succeeds when a row was deleted', async () => {
      repoMock.deletePlacement.mockResolvedValue({ count: 1 });
      await expect(removeFeaturedPlacement('p1', 'dist_1')).resolves.toBeUndefined();
    });
  });
});
