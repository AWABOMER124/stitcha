import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    customerRefreshSession: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        customerRefreshSession: {
          create: mocks.create,
          updateMany: mocks.updateMany,
        },
      }),
    ),
  },
}));

const {
  issueCustomerSession,
  requireCustomerAuth,
  rotateCustomerSession,
} = await import('./customer-session');

const account = {
  id: 'account-1',
  phone: '0912345678',
  name: 'Customer',
  passwordHash: 'hash',
  fcmToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('customer mobile sessions', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-that-is-long-enough-for-ci';
    vi.clearAllMocks();
  });

  it('stores only a hash and issues a short-lived access token', async () => {
    mocks.create.mockResolvedValue({ id: 'session-1' });

    const result = await issueCustomerSession(account.id, 'family-1');

    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken.length).toBeGreaterThan(32);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: account.id,
        familyId: 'family-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
    expect(mocks.create.mock.calls[0][0].data.tokenHash).not.toBe(result.refreshToken);
  });

  it('rotates an active refresh token into the same family', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'session-1',
      accountId: account.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      account,
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.create.mockResolvedValue({ id: 'session-2' });

    const result = await rotateCustomerSession('valid-refresh-token');

    expect(result.account).toEqual(account);
    expect(result.tokens.refreshToken).not.toBe('valid-refresh-token');
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: account.id, familyId: 'family-1' }),
    });
  });

  it('revokes the token family when a rotated token is reused', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'session-1',
      accountId: account.id,
      familyId: 'family-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      account,
    });

    await expect(rotateCustomerSession('reused-refresh-token')).rejects.toThrow(
      UnauthorizedError,
    );
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects an access token after its server-side session is revoked', async () => {
    mocks.create.mockResolvedValue({ id: 'session-1' });
    const tokens = await issueCustomerSession(account.id, 'family-1');
    mocks.findUnique.mockResolvedValue({
      id: 'session-1',
      accountId: account.id,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      account,
    });
    const request = new NextRequest('http://localhost/api/orders/history', {
      headers: { authorization: `Bearer ${tokens.token}` },
    });

    await expect(requireCustomerAuth(request)).rejects.toThrow(UnauthorizedError);
  });

  it('loads the customer for an active access-token session', async () => {
    mocks.create.mockResolvedValue({ id: 'session-1' });
    const tokens = await issueCustomerSession(account.id, 'family-1');
    mocks.findUnique.mockResolvedValue({
      id: 'session-1',
      accountId: account.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      account,
    });
    const request = new NextRequest('http://localhost/api/orders/history', {
      headers: { authorization: `Bearer ${tokens.token}` },
    });

    await expect(requireCustomerAuth(request)).resolves.toEqual(account);
  });
});
