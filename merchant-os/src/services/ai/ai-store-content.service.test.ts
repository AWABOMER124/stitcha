import { describe, it, expect, vi, beforeEach } from 'vitest';

const providerMock = { generate: vi.fn() };
vi.mock('./providers/claude.provider', () => ({
  ClaudeStoreContentProvider: class {
    generate = providerMock.generate;
  },
}));

const { generateStoreContent } = await import('./ai-store-content.service');

describe('generateStoreContent', () => {
  beforeEach(() => {
    providerMock.generate.mockReset();
  });

  it('rejects an empty prompt without calling the provider', async () => {
    await expect(generateStoreContent('   ')).rejects.toThrow('Prompt is required');
    expect(providerMock.generate).not.toHaveBeenCalled();
  });

  it('delegates a non-empty prompt to the provider', async () => {
    providerMock.generate.mockResolvedValue({ name: 'x' });
    const result = await generateStoreContent('a bakery');
    expect(providerMock.generate).toHaveBeenCalledWith('a bakery');
    expect(result).toEqual({ name: 'x' });
  });
});
