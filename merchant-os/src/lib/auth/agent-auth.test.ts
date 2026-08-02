import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

const findUnique = vi.fn();
const update = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  default: {
    apiKey: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

const { requireAgentAuth, generateApiKey } = await import('./agent-auth');

function reqWithAuth(header?: string): NextRequest {
  return new Request('http://localhost', {
    headers: header ? { authorization: header } : {},
  }) as unknown as NextRequest;
}

describe('generateApiKey', () => {
  it('produces a raw key, a distinct hash, and a matching prefix', () => {
    const { raw, hash, prefix } = generateApiKey();
    expect(raw.startsWith('wsk_live_')).toBe(true);
    expect(hash).not.toBe(raw);
    expect(hash).toHaveLength(64); // sha256 hex
    expect(raw.startsWith(prefix)).toBe(true);
  });

  it('never repeats a key across calls', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
  });
});

describe('requireAgentAuth', () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it('rejects a missing Authorization header', async () => {
    await expect(requireAgentAuth(reqWithAuth(), 'stores:draft')).rejects.toThrow(UnauthorizedError);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer scheme', async () => {
    await expect(requireAgentAuth(reqWithAuth('Basic abc123'), 'stores:draft')).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a key that does not exist', async () => {
    findUnique.mockResolvedValue(null);
    await expect(requireAgentAuth(reqWithAuth('Bearer wsk_live_nope'), 'stores:draft')).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('rejects a revoked key', async () => {
    findUnique.mockResolvedValue({
      id: 'key_1',
      distributorId: 'dist_1',
      scopes: ['stores:draft'],
      revokedAt: new Date(),
    });
    await expect(requireAgentAuth(reqWithAuth('Bearer wsk_live_revoked'), 'stores:draft')).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('rejects a key missing the required scope', async () => {
    findUnique.mockResolvedValue({
      id: 'key_1',
      distributorId: 'dist_1',
      scopes: ['merchants:read'],
      revokedAt: null,
    });
    await expect(requireAgentAuth(reqWithAuth('Bearer wsk_live_x'), 'stores:draft')).rejects.toThrow(ForbiddenError);
  });

  it('returns distributor context for a valid, scoped key', async () => {
    findUnique.mockResolvedValue({
      id: 'key_1',
      distributorId: 'dist_1',
      scopes: ['stores:draft', 'merchants:read'],
      revokedAt: null,
    });

    const ctx = await requireAgentAuth(reqWithAuth('Bearer wsk_live_valid'), 'stores:draft');
    expect(ctx).toEqual({ distributorId: 'dist_1', apiKeyId: 'key_1', scopes: ['stores:draft', 'merchants:read'] });
    expect(update).toHaveBeenCalledWith({ where: { id: 'key_1' }, data: { lastUsedAt: expect.any(Date) } });
  });
});
