import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  merchantFindUnique: vi.fn(),
  conversationCreate: vi.fn(),
  checkRateLimit: vi.fn(() => true),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    merchant: { findUnique: mocks.merchantFindUnique },
    conversation: { create: mocks.conversationCreate },
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/store/demo/inquiry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ slug: 'demo' }) };

describe('store inquiry route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockReturnValue(true);
    mocks.merchantFindUnique.mockResolvedValue({ id: 'merchant-demo' });
    mocks.conversationCreate.mockResolvedValue({ id: 'conversation-1' });
  });

  it('derives the merchant from the slug and rejects client tenant IDs', async () => {
    const response = await POST(request({
      customerName: 'Customer',
      message: 'Hello',
      merchantId: 'merchant-attacker-selected',
    }), context);

    expect(response.status).toBe(400);
    expect(mocks.conversationCreate).not.toHaveBeenCalled();
  });

  it('creates a bounded inquiry for the active slug merchant', async () => {
    const response = await POST(request({ customerName: 'Customer', message: 'Hello' }), context);

    expect(response.status).toBe(200);
    expect(mocks.merchantFindUnique).toHaveBeenCalledWith({
      where: { slug: 'demo', isActive: true, status: 'ACTIVE' },
      select: { id: true },
    });
    expect(mocks.conversationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ merchantId: 'merchant-demo' }),
    }));
  });

  it('rate-limits repeated public submissions', async () => {
    mocks.checkRateLimit.mockReturnValue(false);
    const response = await POST(request({ customerName: 'Customer', message: 'Hello' }), context);

    expect(response.status).toBe(429);
    expect(mocks.merchantFindUnique).not.toHaveBeenCalled();
  });
});
