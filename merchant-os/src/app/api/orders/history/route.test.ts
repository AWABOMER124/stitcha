import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireCustomerAuth: vi.fn(),
  getOrderHistoryForAccount: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  requireCustomerAuth: mocks.requireCustomerAuth,
}));

vi.mock('@/modules/storefront/services/storefront.service', () => ({
  getOrderHistoryForAccount: mocks.getOrderHistoryForAccount,
}));

import { GET } from './route';

describe('mobile order history route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCustomerAuth.mockResolvedValue({ id: 'account-1' });
  });

  it('loads only the authenticated account history', async () => {
    const history = [{ id: 'order-1', status: 'completed' }];
    mocks.getOrderHistoryForAccount.mockResolvedValue(history);
    const request = new NextRequest('http://localhost/api/orders/history');
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: history });
    expect(mocks.getOrderHistoryForAccount).toHaveBeenCalledWith('account-1');
  });

  it('rejects unauthenticated history access', async () => {
    mocks.requireCustomerAuth.mockRejectedValue(new UnauthorizedError());
    const request = new NextRequest('http://localhost/api/orders/history');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.getOrderHistoryForAccount).not.toHaveBeenCalled();
  });
});
