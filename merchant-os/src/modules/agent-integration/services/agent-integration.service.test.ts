import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, BusinessRuleError } from '@/lib/errors';

const repoMock = {
  createStoreDraft: vi.fn(),
  findDraftById: vi.fn(),
  listDraftsForDistributor: vi.fn(),
  markDraftApproved: vi.fn(),
  markDraftRejected: vi.fn(),
  listMerchantsForDistributor: vi.fn(),
  findMerchantForDistributor: vi.fn(),
  getOrderStatusCounts: vi.fn(),
  createApiKey: vi.fn(),
  listApiKeysForDistributor: vi.fn(),
  revokeApiKey: vi.fn(),
};

const transactionMock = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  default: { $transaction: (...args: unknown[]) => transactionMock(...args) },
}));

vi.mock('../repositories/agent-integration.repository', () => repoMock);

const service = await import('./agent-integration.service');

describe('agent-integration.service', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
    transactionMock.mockReset();
  });

  describe('createStoreDraft', () => {
    it('persists the draft under the calling distributor and API key', async () => {
      repoMock.createStoreDraft.mockResolvedValue({ id: 'draft_1', status: 'PENDING' });

      const result = await service.createStoreDraft('dist_1', 'key_1', {
        prompt: 'مطعم برجر',
        name: 'برجر هاوس',
        categories: [{ name: 'برجر', products: [{ name: 'كلاسيك برجر', price: 12 }] }],
      });

      expect(repoMock.createStoreDraft).toHaveBeenCalledWith(
        expect.objectContaining({ distributorId: 'dist_1', apiKeyId: 'key_1', name: 'برجر هاوس' })
      );
      expect(result).toEqual({ id: 'draft_1', status: 'PENDING' });
    });
  });

  describe('getStoreDraft', () => {
    it('throws NotFoundError when the draft does not belong to this distributor', async () => {
      repoMock.findDraftById.mockResolvedValue(null);
      await expect(service.getStoreDraft('draft_x', 'dist_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('rejectStoreDraft', () => {
    it('rejects a pending draft', async () => {
      repoMock.findDraftById.mockResolvedValue({ id: 'draft_1', status: 'PENDING' });
      repoMock.markDraftRejected.mockResolvedValue({ id: 'draft_1', status: 'REJECTED' });

      await service.rejectStoreDraft('draft_1', 'dist_1', 'user_1', 'not a fit');
      expect(repoMock.markDraftRejected).toHaveBeenCalledWith('draft_1', 'user_1', 'not a fit');
    });

    it('refuses to re-review an already-decided draft', async () => {
      repoMock.findDraftById.mockResolvedValue({ id: 'draft_1', status: 'APPROVED' });
      await expect(service.rejectStoreDraft('draft_1', 'dist_1', 'user_1')).rejects.toThrow(BusinessRuleError);
      expect(repoMock.markDraftRejected).not.toHaveBeenCalled();
    });
  });

  describe('approveStoreDraft', () => {
    it('refuses to re-review an already-decided draft', async () => {
      repoMock.findDraftById.mockResolvedValue({ id: 'draft_1', status: 'REJECTED' });
      await expect(
        service.approveStoreDraft('draft_1', 'dist_1', 'user_1', { phone: '0911111111', address: 'Khartoum' })
      ).rejects.toThrow(BusinessRuleError);
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('creates the merchant plus its categories/products and marks the draft approved', async () => {
      repoMock.findDraftById.mockResolvedValue({
        id: 'draft_1',
        status: 'PENDING',
        name: 'برجر هاوس',
        description: 'أفضل برجر',
        categories: [{ name: 'برجر', products: [{ name: 'كلاسيك', price: 12 }, { name: 'دبل', price: 18 }] }],
      });

      const merchantCreate = vi.fn().mockResolvedValue({ id: 'merch_1', slug: 'burger-house-abc' });
      const categoryCreate = vi.fn().mockResolvedValue({ id: 'cat_1' });
      const productCreate = vi.fn().mockResolvedValue({ id: 'prod_1' });
      transactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          merchant: { create: merchantCreate },
          category: { create: categoryCreate },
          product: { create: productCreate },
        })
      );
      repoMock.markDraftApproved.mockResolvedValue({ id: 'draft_1', status: 'APPROVED' });

      const result = await service.approveStoreDraft('draft_1', 'dist_1', 'user_1', {
        phone: '0911111111',
        address: 'Khartoum',
      });

      expect(merchantCreate).toHaveBeenCalledTimes(1);
      expect(categoryCreate).toHaveBeenCalledTimes(1);
      expect(productCreate).toHaveBeenCalledTimes(2);
      expect(repoMock.markDraftApproved).toHaveBeenCalledWith('draft_1', 'merch_1', 'user_1');
      expect(result).toEqual({ id: 'merch_1', slug: 'burger-house-abc' });
    });
  });

  describe('getMerchantOrderSummary', () => {
    it('throws NotFoundError for a merchant outside the distributor', async () => {
      repoMock.findMerchantForDistributor.mockResolvedValue(null);
      await expect(service.getMerchantOrderSummary('merch_1', 'dist_1')).rejects.toThrow(NotFoundError);
    });

    it('buckets raw order-status counts into the app vocabulary', async () => {
      repoMock.findMerchantForDistributor.mockResolvedValue({ id: 'merch_1' });
      repoMock.getOrderStatusCounts.mockResolvedValue([
        { status: 'NEW', _count: { _all: 3 } },
        { status: 'ACCEPTED', _count: { _all: 2 } },
        { status: 'DELIVERED', _count: { _all: 10 } },
        { status: 'CANCELLED', _count: { _all: 1 } },
      ]);

      const summary = await service.getMerchantOrderSummary('merch_1', 'dist_1');
      expect(summary).toEqual({ pending: 5, preparing: 0, delivering: 0, completed: 10, cancelled: 1 });
    });
  });

  describe('revokeApiKey', () => {
    it('throws NotFoundError when nothing matched (wrong distributor or unknown id)', async () => {
      repoMock.revokeApiKey.mockResolvedValue({ count: 0 });
      await expect(service.revokeApiKey('key_1', 'dist_1')).rejects.toThrow(NotFoundError);
    });

    it('succeeds when a row was revoked', async () => {
      repoMock.revokeApiKey.mockResolvedValue({ count: 1 });
      await expect(service.revokeApiKey('key_1', 'dist_1')).resolves.toBeUndefined();
    });
  });
});
