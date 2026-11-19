import { isIP } from 'node:net';
import ranges from './pricing-country-ranges.json';
import type { SubscriptionMarket } from '@/modules/merchant-subscriptions/market-pricing';

export const PRICING_MARKET_COOKIE = 'wasla_pricing_market';
export type PricingSelection = { market: SubscriptionMarket | null; source: 'account' | 'location' | 'choice' | null };

export function validPricingMarket(value: unknown): SubscriptionMarket | null {
  return value === 'SA' || value === 'SD' ? value : null;
}

const v6 = ranges.v6.map(([start, end, country]) => [BigInt(`0x${start}`), BigInt(`0x${end}`), country] as const);

// Offline IP-to-country lookup: no visitor IP is sent to a third party or stored.
export function countryForIp(input: string | null): SubscriptionMarket | null {
  if (!input || input.includes('%')) return null;
  let ip = input.trim();
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) ip = ip.slice(7);
  const version = isIP(ip);
  if (!version) return null;
  if (version === 4) {
    const value = ip.split('.').reduce((result, part) => result * 256 + Number(part), 0);
    let lo = 0, hi = ranges.v4.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const [start, end, country] = ranges.v4[mid];
      if (value < Number(start)) hi = mid - 1;
      else if (value > Number(end)) lo = mid + 1;
      else return validPricingMarket(country);
    }
    return null;
  }
  // IPv4 embedded in IPv6 outside the mapped form is not a country signal.
  if (ip.includes('.')) return null;
  const halves = ip.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const groups = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  const value = BigInt(`0x${groups.map(group => group.padStart(4, '0')).join('')}`);
  let lo = 0, hi = v6.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const [start, end, country] = v6[mid];
    if (value < start) hi = mid - 1;
    else if (value > end) lo = mid + 1;
    else return validPricingMarket(country);
  }
  return null;
}

export function detectedPricingMarket(headers: Pick<Headers, 'get'>): SubscriptionMarket | null {
  // Only enable behind our Traefik, which strips untrusted forwarded headers and
  // writes X-Real-IP from the socket. Application containers must have no public port.
  return process.env.PRICING_TRUST_PROXY === 'traefik' ? countryForIp(headers.get('x-real-ip')) : null;
}

export function selectPricingMarket(account: unknown, location: unknown, preference: unknown): PricingSelection {
  const merchant = validPricingMarket(account);
  if (merchant) return { market: merchant, source: 'account' };
  const detected = validPricingMarket(location);
  if (detected) return { market: detected, source: 'location' };
  const choice = validPricingMarket(preference);
  return { market: choice, source: choice ? 'choice' : null };
}
