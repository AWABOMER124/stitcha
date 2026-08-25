import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireCustomerAuth: vi.fn(),
  placeOrderForAccount: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  requireCustomerAuth: mocks.requireCustomerAuth,
}));

vi.mock('@/modules/storefront/services/storefront.service', () => ({
  placeOrderForAccount: mocks.placeOrderForAccount,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  enforceRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('mobile order creation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCustomerAuth.mockResolvedValue({
      id: 'account-1',
      name: 'Customer',
      phone: '0912345678',
    });
  });

  it('authenticates and translates the mobile wire contract', async () => {
    const created = { id: 'order-1', status: 'pending', totalAmount: 250 };
    mocks.placeOrderForAccount.mockResolvedValue(created);
    const response = await POST(request({
      items: [{ product_id: 'product-1', qty: 2 }],
      address: 'Khartoum',
      payment_method: 'cash',
      notes: 'Call on arrival',
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: created });
    expect(mocks.placeOrderForAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'account-1' }),
      {
        items: [{ productId: 'product-1', quantity: 2 }],
        address: 'Khartoum',
        paymentMethod: 'cash',
        notes: 'Call on arrival',
      },
    );
  });

  it.each([0, -1, 1.5])('rejects an invalid item quantity (%s)', async (qty) => {
    const response = await POST(request({
      items: [{ product_id: 'product-1', qty }],
    }));

    expect(response.status).toBe(422);
    expect(mocks.placeOrderForAccount).not.toHaveBeenCalled();
  });

  it('returns the authentication error without calling the order service', async () => {
    mocks.requireCustomerAuth.mockRejectedValue(new UnauthorizedError());
    const response = await POST(request({
      items: [{ product_id: 'product-1', qty: 1 }],
    }));

    expect(response.status).toBe(401);
    expect(mocks.placeOrderForAccount).not.toHaveBeenCalled();
  });
});
