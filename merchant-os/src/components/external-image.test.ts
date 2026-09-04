import { describe, expect, it } from 'vitest';
import { normalizePublicImageUrl } from './external-image';

describe('public image URL normalization', () => {
  it('repairs upload URLs saved with a localhost origin', () => {
    expect(normalizePublicImageUrl('http://localhost:3000/uploads/store/banner.webp')).toBe('/uploads/store/banner.webp');
  });

  it('normalizes relative upload paths and upgrades remote HTTP assets', () => {
    expect(normalizePublicImageUrl('uploads/store/logo.webp')).toBe('/uploads/store/logo.webp');
    expect(normalizePublicImageUrl('http://cdn.example.com/logo.webp')).toBe('https://cdn.example.com/logo.webp');
  });

  it('trims persisted URLs and secures protocol-relative CDN images', () => {
    expect(normalizePublicImageUrl('  /uploads/store/product.webp  ')).toBe('/uploads/store/product.webp');
    expect(normalizePublicImageUrl('//cdn.example.com/product.webp')).toBe('https://cdn.example.com/product.webp');
  });
});
