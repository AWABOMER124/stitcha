import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }));
vi.mock('@/modules/merchant-subscriptions/merchant-subscriptions.service', () => ({ getMerchantSubscriptionMarket: mocks.account }));
import { POST } from './route';

function request(body: unknown, extra: Record<string, string> = {}) {
  return new Request('https://wassla-sd.shop/api/pricing/market', {
    method: 'POST', headers: { host: 'wassla-sd.shop', origin: 'https://wassla-sd.shop', 'content-type': 'application/json', ...extra },
    body: JSON.stringify(body),
  });
}

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('PRICING_TRUST_PROXY', 'traefik'); mocks.auth.mockResolvedValue(null); });

describe('pricing country preference', () => {
  it('stores a validated explicit choice without changing merchant data', async () => {
    const response = await POST(request({ market: 'SA' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ market: 'SA', source: 'choice' });
    expect(response.headers.get('set-cookie')).toContain('wasla_pricing_market=SA');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(mocks.account).not.toHaveBeenCalled();
  });
  it('does not let a Saudi visitor switch to Sudan prices', async () => {
    const response = await POST(request({ market: 'SD' }, { 'x-real-ip': '2.59.52.0' }));
    expect(await response.json()).toEqual({ market: 'SA', source: 'location' });
  });
  it('preserves the registered merchant market', async () => {
    mocks.auth.mockResolvedValue({ user: { merchantId: 'merchant-test' } });
    mocks.account.mockResolvedValue('SD');
    const response = await POST(request({ market: 'SA' }, { 'x-real-ip': '2.59.52.0' }));
    expect(await response.json()).toEqual({ market: 'SD', source: 'account' });
  });
  it('can clear an unknown-location preference', async () => {
    const response = await POST(request({ market: null }));
    expect(await response.json()).toEqual({ market: null, source: null });
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
  it.each(['https://evil.example', 'invalid', 'null'])('rejects an untrusted origin %s', async origin => {
    expect((await POST(request({ market: 'SD' }, { origin }))).status).toBe(403);
  });
  it.each([{}, { market: 'US' }, null])('rejects invalid choices', async body => {
    expect((await POST(request(body))).status).toBe(400);
  });
});
