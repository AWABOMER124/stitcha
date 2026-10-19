import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatePartnerEndpoint } from './partner-endpoint';

afterEach(() => vi.unstubAllEnvs());
describe('operator-approved delivery endpoints', () => {
  it('rejects an unapproved API origin', () => {
    vi.stubEnv('DELIVERY_PARTNER_API_ORIGINS', '');
    expect(() => validatePartnerEndpoint('https://unapproved.example/')).toThrow();
  });
  it('accepts HTTPS only for exact approved origins', () => {
    vi.stubEnv('DELIVERY_PARTNER_API_ORIGINS', 'https://carrier.example');
    expect(validatePartnerEndpoint('https://carrier.example/v1').pathname).toBe('/v1');
    expect(() => validatePartnerEndpoint('https://carrier.example.attacker.example')).toThrow();
    expect(() => validatePartnerEndpoint('http://carrier.example')).toThrow();
  });
  it('rejects credentials, query strings and fragments', () => {
    vi.stubEnv('DELIVERY_PARTNER_API_ORIGINS', 'https://carrier.example');
    for (const url of ['https://user:pass@carrier.example', 'https://carrier.example?token=x', 'https://carrier.example#x']) expect(() => validatePartnerEndpoint(url)).toThrow();
  });
  it('never allows the local test escape hatch in production', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DELIVERY_PARTNER_ALLOW_LOCAL_TEST', 'true');
    expect(() => validatePartnerEndpoint('http://127.0.0.1:1234')).toThrow();
  });
  it('accepts the exact database-approved origin without an env entry', () => {
    vi.stubEnv('DELIVERY_PARTNER_API_ORIGINS', '');
    expect(validatePartnerEndpoint('https://carrier.example/events', 'https://carrier.example').pathname).toBe('/events');
    expect(() => validatePartnerEndpoint('https://other.example/events', 'https://carrier.example')).toThrow();
  });
  it('allows a safe public endpoint to be stored pending admin review', () => {
    vi.stubEnv('DELIVERY_PARTNER_API_ORIGINS', '');
    expect(validatePartnerEndpoint('https://carrier.example/events', null, true).origin).toBe('https://carrier.example');
    expect(() => validatePartnerEndpoint('https://127.0.0.1/events', null, true)).toThrow();
  });
});
