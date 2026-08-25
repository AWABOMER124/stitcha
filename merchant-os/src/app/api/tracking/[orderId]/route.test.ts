import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireCustomerAuth: vi.fn(),
  orderFindFirst: vi.fn(),
  orderFindUnique: vi.fn(),
  assignmentFindUnique: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  requireCustomerAuth: mocks.requireCustomerAuth,
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    order: {
      findFirst: mocks.orderFindFirst,
      findUnique: mocks.orderFindUnique,
    },
    driverAssignment: { findUnique: mocks.assignmentFindUnique },
  },
}));

import { GET } from './route';

const context = { params: Promise.resolve({ orderId: 'order-1' }) };

describe('customer order tracking route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCustomerAuth.mockResolvedValue({ id: 'account-1' });
  });

  it('only looks up orders owned by the authenticated customer', async () => {
    mocks.orderFindFirst.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/tracking/order-1');
    const response = await GET(request, context);

    expect(response.status).toBe(404);
    expect(mocks.orderFindFirst).toHaveBeenCalledWith({
      where: { id: 'order-1', customer: { accountId: 'account-1' } },
      select: { status: true },
    });
  });

  it('does not expose a permissive cross-origin header', async () => {
    mocks.orderFindFirst.mockResolvedValue({ status: 'NEW' });
    const abort = new AbortController();
    const request = new NextRequest('http://localhost/api/tracking/order-1', { signal: abort.signal });
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const firstFrame = await response.body!.getReader().read();
    expect(new TextDecoder().decode(firstFrame.value)).toContain('ORDER_STATUS');
    abort.abort();
  });
});
