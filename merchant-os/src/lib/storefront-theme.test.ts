import { describe, expect, it } from 'vitest';
import { normalizeStorefrontTheme, STOREFRONT_SECTIONS } from './storefront-theme';

describe('storefront theme normalization', () => {
  it('upgrades legacy three-section themes without losing their order', () => {
    const theme = normalizeStorefrontTheme({ sectionOrder: ['hero', 'categories', 'products'], primaryColor: '#123456' }, 'متجر');
    expect(theme.sectionOrder.slice(0, 3)).toEqual(['hero', 'categories', 'products']);
    expect(theme.sectionOrder).toHaveLength(STOREFRONT_SECTIONS.length);
    expect(theme.primaryColor).toBe('#123456');
  });

  it('rejects invalid colors and unknown sections', () => {
    const theme = normalizeStorefrontTheme({ primaryColor: 'red', sectionOrder: ['evil'] }, 'متجر');
    expect(theme.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.sectionOrder).not.toContain('evil');
  });
});
