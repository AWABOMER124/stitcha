import { describe, expect, it } from 'vitest';
import { createProductSchema } from './products.schemas';

const product = { name: 'Coffee', categoryId: 'cm12345678901234567890123', price: 10 };

describe('product image contract', () => {
  it('accepts managed local uploads and secure CDN URLs', () => {
    expect(createProductSchema.parse({ ...product, images: ['/uploads/merchant/image.webp', 'https://cdn.example.com/image.png'] }).images)
      .toHaveLength(2);
  });

  it('rejects insecure and oversized image lists', () => {
    expect(() => createProductSchema.parse({ ...product, images: ['http://example.com/image.png'] })).toThrow();
    expect(() => createProductSchema.parse({ ...product, images: Array(11).fill('/uploads/image.webp') })).toThrow();
  });
});
