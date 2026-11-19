import { afterEach, describe, expect, it, vi } from 'vitest';
import { countryForIp, detectedPricingMarket, selectPricingMarket } from './visitor-market';
import ranges from './pricing-country-ranges.json';

afterEach(() => vi.unstubAllEnvs());

describe('visitor pricing country', () => {
  it('keeps merchant country authoritative while travelling', () => {
    expect(selectPricingMarket('SD', 'SA', 'SA')).toEqual({ market: 'SD', source: 'account' });
    expect(selectPricingMarket('SA', 'SD', 'SD')).toEqual({ market: 'SA', source: 'account' });
  });
  it('automatic Saudi selection overrides a saved Sudan choice', () => {
    expect(selectPricingMarket(null, 'SA', 'SD')).toEqual({ market: 'SA', source: 'location' });
  });
  it('requires an explicit choice when country cannot be determined', () => {
    expect(selectPricingMarket(null, null, undefined)).toEqual({ market: null, source: null });
    expect(selectPricingMarket(null, null, 'invalid').market).toBeNull();
    expect(selectPricingMarket(null, null, 'SD')).toEqual({ market: 'SD', source: 'choice' });
  });
  it('looks up Saudi IPv4 and mapped IPv4 offline', () => {
    expect(countryForIp('51.39.229.125')).toBe('SA');
    expect(countryForIp('::ffff:51.39.229.125')).toBe('SA');
  });
  it('supports IPv6 boundaries for both countries', () => {
    for (const country of ['SA', 'SD']) {
      const row = ranges.v6.find(row => row[2] === country)!;
      expect(row).toBeDefined();
      for (const hex of row.slice(0, 2)) {
        const ip = String(hex).match(/.{4}/g)!.join(':');
        expect(countryForIp(ip)).toBe(country);
      }
    }
  });
  it.each([null, '', '127.0.0.1', '10.0.0.1', '::1', '::', 'fe80::1%eth0', '999.1.2.3', '51.39.229.125, 1.1.1.1', '1.1.1.1'])('does not guess a country for %s', ip => {
    expect(countryForIp(ip)).toBeNull();
  });
  it('requires the trusted proxy configuration and ignores country/forwarded header claims', () => {
    const headers = new Headers({ 'x-real-ip': '51.39.229.125', 'cf-ipcountry': 'SD' });
    vi.stubEnv('PRICING_TRUST_PROXY', '');
    expect(detectedPricingMarket(headers)).toBeNull();
    vi.stubEnv('PRICING_TRUST_PROXY', 'traefik');
    expect(detectedPricingMarket(headers)).toBe('SA');
    expect(detectedPricingMarket(new Headers({ 'cf-ipcountry': 'SA', 'x-forwarded-for': '51.39.229.125' }))).toBeNull();
  });
});
