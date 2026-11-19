import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn(), plans: vi.fn(), cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock('@/modules/merchant-subscriptions/merchant-subscriptions.service', () => ({ getMerchantSubscriptionMarket: mocks.account }));
vi.mock('@/modules/merchant-subscriptions', () => ({ listPublicPlans: mocks.plans }));
import HomePage from './page';

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('PRICING_TRUST_PROXY', 'traefik');
  mocks.auth.mockResolvedValue(null);
  mocks.cookies.mockResolvedValue({ get: () => undefined });
  mocks.headers.mockResolvedValue(new Headers());
  mocks.plans.mockResolvedValue([]);
});

it('does not load any catalog before country selection, including an old market URL', async () => {
  await HomePage({ searchParams: Promise.resolve({ market: 'SD' }) });
  expect(mocks.plans).not.toHaveBeenCalled();
});

it('loads only Saudi prices for a Saudi guest despite a Sudan URL and preference', async () => {
  mocks.headers.mockResolvedValue(new Headers({ 'x-real-ip': '2.59.52.0' }));
  mocks.cookies.mockResolvedValue({ get: (key: string) => key === 'wasla_pricing_market' ? { value: 'SD' } : undefined });
  await HomePage({ searchParams: Promise.resolve({ market: 'SD' }) });
  expect(mocks.plans).toHaveBeenCalledExactlyOnceWith('SA');
});

it('loads only the signed-in merchant catalog while travelling', async () => {
  mocks.auth.mockResolvedValue({ user: { merchantId: 'merchant-test', role: 'MERCHANT_OWNER' } });
  mocks.account.mockResolvedValue('SD');
  mocks.headers.mockResolvedValue(new Headers({ 'x-real-ip': '2.59.52.0' }));
  await HomePage({ searchParams: Promise.resolve({ market: 'SA' }) });
  expect(mocks.plans).toHaveBeenCalledExactlyOnceWith('SD');
});
