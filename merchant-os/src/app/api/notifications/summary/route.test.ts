import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), count: vi.fn(), mark: vi.fn(), platformList: vi.fn(), platformCount: vi.fn(), platformMark: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }));
vi.mock('@/modules/communications/merchant-inbox', () => ({ mergedMerchantNotifications: mocks.list, mergedMerchantUnreadCount: mocks.count, markMergedMerchantRead: mocks.mark }));
vi.mock('@/modules/platform-notifications/services/platform-notifications.service', () => ({ getNotifications: mocks.platformList, getUnreadCount: mocks.platformCount, markAsRead: mocks.platformMark }));
const { GET, PATCH } = await import('./route');
const patch = (body: unknown, origin = 'https://wasla.example') => PATCH(new Request('https://wasla.example/api/notifications/summary', { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));

describe('notification summary API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'owner-a', merchantId: 'store-a', role: 'MERCHANT_OWNER', permissions: [] } });
    mocks.list.mockResolvedValue({ data: [{ id: 'notice-a' }] }); mocks.count.mockResolvedValue(1);
    mocks.platformList.mockResolvedValue({ data: [] }); mocks.platformCount.mockResolvedValue(0);
  });
  it('rejects anonymous readers without querying an inbox', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('returns a private summary using only the signed-in tenant and user', async () => {
    const response = await GET();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ unreadCount: 1, notifications: [{ id: 'notice-a' }] });
    expect(mocks.list).toHaveBeenCalledWith('store-a', 'owner-a', { limit: 5 });
    expect(mocks.platformList).not.toHaveBeenCalled();
    expect(mocks.mark).not.toHaveBeenCalled();
  });
  it('requires the existing notification permission for staff', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'staff-a', merchantId: 'store-a', role: 'CASHIER', permissions: [] } });
    expect((await GET()).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('marks messages within the signed-in scope, then refreshes the badge', async () => {
    expect((await patch({ ids: ['notice-a', 'message_personal-a'] })).status).toBe(200);
    expect(mocks.mark).toHaveBeenCalledWith('store-a', 'owner-a', ['notice-a', 'message_personal-a']);
  });
  it('rejects cross-origin mutations and client-supplied tenant overrides', async () => {
    expect((await patch({ ids: ['notice-a'] }, 'https://other.example')).status).toBe(403);
    expect((await patch({ ids: ['notice-a'], merchantId: 'store-b' })).status).toBe(400);
    expect((await patch({ ids: [] })).status).toBe(400);
    expect(mocks.mark).not.toHaveBeenCalled();
  });
  it('keeps the platform inbox separate from merchant messages', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'platform-owner', role: 'PLATFORM_OWNER', permissions: [] } });
    expect((await GET()).status).toBe(200);
    expect(mocks.platformList).toHaveBeenCalledWith({ limit: 5 });
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
