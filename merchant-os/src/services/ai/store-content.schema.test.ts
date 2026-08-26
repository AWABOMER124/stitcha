import { describe, expect, it } from 'vitest';
import { storeContentSchema, storeGenerationPromptSchema } from './store-content.schema';

const validStore = {
  name: 'بيت القهوة',
  description: 'متجر قهوة مختصة',
  slogan: 'قهوتك أقرب',
  primaryColor: '#13C4A3',
  welcomeText: 'أهلاً بكم',
  categories: [{ name: 'القهوة', products: [{ name: 'بن إثيوبي', price: 5000 }] }],
};

describe('AI store content contract', () => {
  it('accepts a bounded, valid generated storefront', () => {
    expect(storeContentSchema.parse(validStore)).toEqual(validStore);
  });

  it('rejects invalid colors and oversized generated catalogues', () => {
    expect(() => storeContentSchema.parse({ ...validStore, primaryColor: 'teal' })).toThrow();
    expect(() => storeContentSchema.parse({ ...validStore, categories: Array(31).fill(validStore.categories[0]) })).toThrow();
  });

  it('trims and bounds the merchant prompt', () => {
    expect(storeGenerationPromptSchema.parse('  متجر قهوة سودانية متخصصة  ')).toBe('متجر قهوة سودانية متخصصة');
    expect(() => storeGenerationPromptSchema.parse('   ')).toThrow('Prompt is required');
  });
});
