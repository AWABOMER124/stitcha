import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  merchant: { create: vi.fn() },
  user: { create: vi.fn() },
  merchantUser: { create: vi.fn() },
  branch: { create: vi.fn() },
  storefrontSettings: { create: vi.fn() },
};
const prismaMock = {
  user: { findFirst: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock)),
};

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('password-hash') } }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

const { POST } = await import('./route');

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    Object.values(txMock).forEach((model) => Object.values(model).forEach((fn) => fn.mockReset()));
    prismaMock.user.findFirst.mockReset().mockResolvedValue(null);
    prismaMock.$transaction.mockClear();
    txMock.merchant.create.mockResolvedValue({ id: 'merchant_1', slug: 'store-1' });
    txMock.user.create.mockResolvedValue({ id: 'user_1' });
  });

  it('creates every direct merchant on the free Basic plan', async () => {
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        merchantName: 'Test Store', ownerName: 'Owner', email: 'owner@example.com',
        phone: '+249111222333', password: 'password123', businessType: 'RETAIL',
      }),
    }));

    expect(response.status).toBe(201);
    expect(txMock.merchant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'ACTIVE',
        subscription: { create: { plan: { connect: { code: 'FREE' } } } },
      }),
    });
    await expect(response.json()).resolves.toEqual({ slug: 'store-1' });
  });
});
