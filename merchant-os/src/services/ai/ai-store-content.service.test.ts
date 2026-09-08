import { beforeEach, describe, expect, it, vi } from 'vitest';

const providerMock = { generate: vi.fn() };
vi.mock('./providers/ai-core-store-content.provider', () => ({
  AiCoreStoreContentProvider: class { generate = providerMock.generate; },
  isAiCoreEnabledForTenant: () => true,
  isAiCoreStoreGenerationConfigured: () => true,
}));
const { generateStoreContentWithMetadata } = await import('./ai-store-content.service');

describe('AI store generation', () => {
  beforeEach(() => providerMock.generate.mockReset());
  it('rejects an empty prompt before calling AI Core', async () => {
    await expect(generateStoreContentWithMetadata('   ', { merchantId: 'merchant_1', actorId: 'user_1' })).rejects.toThrow('Prompt is required');
    expect(providerMock.generate).not.toHaveBeenCalled();
  });
  it('uses AI Core only, with no direct provider fallback', async () => {
    providerMock.generate.mockResolvedValue({ content: { name: 'متجر', description: 'وصف', primaryColor: '#111111', categories: [], products: [] }, projectId: 'project_1', versionId: 'version_1', versionNumber: 1, requestId: 'req_1' });
    const result = await generateStoreContentWithMetadata('متجر تجريبي', { merchantId: 'merchant_1', actorId: 'user_1' });
    expect(providerMock.generate).toHaveBeenCalledOnce();
    expect(result.usage.provider).toBe('ai-core');
  });
});
