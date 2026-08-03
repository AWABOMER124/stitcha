import { describe, it, expect } from 'vitest';
import { dictionaries } from './translations';

/** Recursively collects "path -> value" for every leaf string in a dictionary object. */
function leafPaths(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') return { [prefix]: obj };
  return Object.entries(obj as Record<string, unknown>).reduce(
    (acc, [key, value]) => ({ ...acc, ...leafPaths(value, prefix ? `${prefix}.${key}` : key) }),
    {}
  );
}

describe('translations dictionaries', () => {
  it('ar and en expose exactly the same set of keys (no missing/extra translations)', () => {
    const arKeys = Object.keys(leafPaths(dictionaries.ar)).sort();
    const enKeys = Object.keys(leafPaths(dictionaries.en)).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it('no leaf value is undefined in either locale', () => {
    for (const locale of ['ar', 'en'] as const) {
      const leaves = leafPaths(dictionaries[locale]);
      for (const [path, value] of Object.entries(leaves)) {
        expect(value, `${locale}.${path} should not be undefined`).not.toBeUndefined();
      }
    }
  });

  it('storefrontPublic section is fully populated in both locales', () => {
    expect(Object.keys(dictionaries.ar.storefrontPublic).length).toBeGreaterThan(50);
    expect(Object.keys(dictionaries.en.storefrontPublic).length).toBe(
      Object.keys(dictionaries.ar.storefrontPublic).length
    );
  });
});
