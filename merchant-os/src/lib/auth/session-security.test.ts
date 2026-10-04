import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  merchantUser: { findFirst: vi.fn() },
  deliveryPartnerUser: { findFirst: vi.fn() },
  distributorUser: { findFirst: vi.fn() },
}));

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

import { isSessionSecurityStateValid } from './session-security';

describe('isSessionSecurityStateValid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('revokes a session after the password auth version changes', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ authVersion: 2, role: 'MERCHANT_OWNER', platformAccessEnabled: false });
    await expect(isSessionSecurityStateValid({ id: 'user-1', role: 'MERCHANT_OWNER', authVersion: 1, merchantId: 'merchant-1' })).resolves.toBe(false);
    expect(prismaMock.merchantUser.findFirst).not.toHaveBeenCalled();
  });

  it('revokes a disabled platform account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ authVersion: 0, role: 'PLATFORM_ADMIN', platformAccessEnabled: false });
    await expect(isSessionSecurityStateValid({ id: 'admin-1', role: 'PLATFORM_ADMIN', authVersion: 0 })).resolves.toBe(false);
  });

  it('requires an active membership in an active merchant', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ authVersion: 0, role: 'MERCHANT_OWNER', platformAccessEnabled: false });
    prismaMock.merchantUser.findFirst.mockResolvedValue({ id: 'membership-1' });
    await expect(isSessionSecurityStateValid({ id: 'user-1', role: 'MERCHANT_OWNER', authVersion: 0, merchantId: 'merchant-1' })).resolves.toBe(true);
    expect(prismaMock.merchantUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ merchantId: 'merchant-1', isActive: true }),
    }));
  });

  it('allows a standalone marketer when the auth version still matches', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ authVersion: 3, role: 'MARKETER', platformAccessEnabled: false });
    await expect(isSessionSecurityStateValid({ id: 'marketer-1', role: 'MARKETER', authVersion: 3 })).resolves.toBe(true);
  });
});
