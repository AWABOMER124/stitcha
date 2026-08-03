import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@/lib/errors';

const repoMock = {
  findAccountByPhone: vi.fn(),
  createSubscription: vi.fn(),
  listAll: vi.fn(),
  cancelSubscription: vi.fn(),
  hasActive: vi.fn(),
};

vi.mock('../repositories/customer-subscriptions.repository', () => repoMock);

const { grantSubscription, listSubscriptions, cancelSubscription, hasActiveDeliveryPerk } = await import(
  './customer-subscriptions.service'
);

describe('customer-subscriptions.service', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
  });

  describe('grantSubscription', () => {
    it('throws NotFoundError when no CustomerAccount matches the phone', async () => {
      repoMock.findAccountByPhone.mockResolvedValue(null);
      await expect(
        grantSubscription('staff_1', { customerPhone: '0900000000', startsAt: new Date(), endsAt: new Date() })
      ).rejects.toThrow(NotFoundError);
      expect(repoMock.createSubscription).not.toHaveBeenCalled();
    });

    it('creates a subscription for the matched account', async () => {
      repoMock.findAccountByPhone.mockResolvedValue({ id: 'account_1', phone: '0911111111' });
      repoMock.createSubscription.mockResolvedValue({ id: 'sub_1' });

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + 86_400_000);
      const result = await grantSubscription('staff_1', { customerPhone: '0911111111', startsAt, endsAt });

      expect(repoMock.createSubscription).toHaveBeenCalledWith({
        customerAccountId: 'account_1',
        startsAt,
        endsAt,
        grantedById: 'staff_1',
        notes: undefined,
      });
      expect(result).toEqual({ id: 'sub_1' });
    });
  });

  describe('listSubscriptions', () => {
    it('marks a currently-running ACTIVE subscription as isActive', async () => {
      const now = new Date();
      repoMock.listAll.mockResolvedValue([
        { id: 's1', status: 'ACTIVE', startsAt: new Date(now.getTime() - 1000), endsAt: new Date(now.getTime() + 1000) },
      ]);
      const result = await listSubscriptions();
      expect(result[0].isActive).toBe(true);
    });

    it('marks a CANCELLED subscription as not active even within its date window', async () => {
      const now = new Date();
      repoMock.listAll.mockResolvedValue([
        { id: 's2', status: 'CANCELLED', startsAt: new Date(now.getTime() - 1000), endsAt: new Date(now.getTime() + 1000) },
      ]);
      const result = await listSubscriptions();
      expect(result[0].isActive).toBe(false);
    });

    it('marks an expired ACTIVE subscription as not active', async () => {
      const now = new Date();
      repoMock.listAll.mockResolvedValue([
        { id: 's3', status: 'ACTIVE', startsAt: new Date(now.getTime() - 2000), endsAt: new Date(now.getTime() - 1000) },
      ]);
      const result = await listSubscriptions();
      expect(result[0].isActive).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('throws NotFoundError when nothing was cancelled', async () => {
      repoMock.cancelSubscription.mockResolvedValue({ count: 0 });
      await expect(cancelSubscription('sub_x')).rejects.toThrow(NotFoundError);
    });

    it('succeeds when a row was cancelled', async () => {
      repoMock.cancelSubscription.mockResolvedValue({ count: 1 });
      await expect(cancelSubscription('sub_1')).resolves.toBeUndefined();
    });
  });

  describe('hasActiveDeliveryPerk', () => {
    it('delegates to the repository', async () => {
      repoMock.hasActive.mockResolvedValue(true);
      await expect(hasActiveDeliveryPerk('account_1')).resolves.toBe(true);
      expect(repoMock.hasActive).toHaveBeenCalledWith('account_1');
    });
  });
});
