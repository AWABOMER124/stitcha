import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('@/modules/customer-auth/services/customer-auth.service', () => ({
  refresh: mocks.refresh,
}));

import { POST } from './route';

describe('customer refresh route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects malformed refresh tokens before the service', async () => {
    const request = new NextRequest('http://localhost/api/customer/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'short' }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': 'refresh-invalid' },
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('returns the rotated token pair', async () => {
    mocks.refresh.mockResolvedValue({
      id: 'account-1',
      name: 'Customer',
      phone: '0912345678',
      token: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    });
    const refreshToken = 'a'.repeat(64);
    const request = new NextRequest('http://localhost/api/customer/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': 'refresh-valid' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.refresh).toHaveBeenCalledWith(refreshToken);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({ token: 'new-access', refreshToken: 'new-refresh' }),
    });
  });
});
