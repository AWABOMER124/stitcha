import { afterEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
vi.mock('@/lib/db/prisma', () => ({ default: { merchant: { findMany } } }));

const { default: sitemap } = await import('./sitemap');
const previousOrigin = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  findMany.mockReset();
  if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousOrigin;
});

describe('sitemap', () => {
  it('includes active public storefronts with canonical production URLs', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://wassla-sd.shop/';
    findMany.mockResolvedValue([{ slug: 'tina-care', updatedAt: new Date('2026-10-29T00:00:00Z') }]);

    const entries = await sitemap();

    expect(entries).toContainEqual(expect.objectContaining({
      url: 'https://wassla-sd.shop/store/tina-care',
      priority: 0.8,
    }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, status: 'ACTIVE' },
    }));
  });

  it('keeps static discovery pages available if the database is unavailable', async () => {
    findMany.mockRejectedValue(new Error('database unavailable'));

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.endsWith('/register'))).toBe(true);
    expect(entries.some((entry) => entry.url.includes('/store/'))).toBe(false);
  });
});
