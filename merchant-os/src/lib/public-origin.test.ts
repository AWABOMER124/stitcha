import { afterEach, describe, expect, it } from 'vitest';
import { resolvePublicOrigin } from './public-origin';

const originalPublicUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalAuthUrl = process.env.NEXTAUTH_URL;
afterEach(() => {
  if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalPublicUrl;
  if (originalAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalAuthUrl;
});

function fakeHeaders(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe('public storefront origin', () => {
  it('uses the forwarded production host when configuration is localhost', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(resolvePublicOrigin(fakeHeaders({ 'x-forwarded-host': 'wassla-sd.shop', 'x-forwarded-proto': 'https' }))).toBe('https://wassla-sd.shop');
  });

  it('prefers an explicitly configured non-local production origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://store.example.com';
    expect(resolvePublicOrigin(fakeHeaders({ host: 'internal:3000' }))).toBe('https://store.example.com');
  });
});
