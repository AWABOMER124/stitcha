import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ revoke: vi.fn() }));

vi.mock('@/lib/auth/customer-session', () => ({
  revokeCurrentCustomerSession: mocks.revoke,
}));

import { POST } from './route';

describe('customer logout route', () => {
  it('revokes the server-side session', async () => {
    const request = new NextRequest('http://localhost/api/customer/auth/logout', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith(request);
    await expect(response.json()).resolves.toEqual({ data: { revoked: true } });
  });
});
