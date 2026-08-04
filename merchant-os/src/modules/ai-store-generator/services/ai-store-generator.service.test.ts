import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateStoreContentMock = vi.fn();
const createPendingMerchantWithInviteMock = vi.fn();

vi.mock('@/services/ai/ai-store-content.service', () => ({ generateStoreContent: generateStoreContentMock }));
vi.mock('@/modules/merchants/services/merchant-invite.service', () => ({
  createPendingMerchantWithInvite: createPendingMerchantWithInviteMock,
}));

const { generateContentForDistributor, createMerchantFromAiContent } = await import('./ai-store-generator.service');

describe('generateContentForDistributor', () => {
  beforeEach(() => generateStoreContentMock.mockReset());

  it('delegates straight to the shared AI content service', async () => {
    generateStoreContentMock.mockResolvedValue({ name: 'x' });
    const result = await generateContentForDistributor('a bakery');
    expect(generateStoreContentMock).toHaveBeenCalledWith('a bakery');
    expect(result).toEqual({ name: 'x' });
  });
});

describe('createMerchantFromAiContent', () => {
  beforeEach(() => createPendingMerchantWithInviteMock.mockReset());

  it('maps AI content + distributor-supplied contact info onto createPendingMerchantWithInvite', async () => {
    createPendingMerchantWithInviteMock.mockResolvedValue({ id: 'merchant_1', slug: 'store-abc' });

    const result = await createMerchantFromAiContent('dist_1', {
      phone: '0911111111',
      address: 'الخرطوم',
      businessType: 'RESTAURANT',
      content: {
        name: 'مطعم الذواقة',
        description: 'مطعم شعبي',
        primaryColor: '#ff0000',
        welcomeText: 'أهلاً بكم',
        categories: [{ name: 'وجبات', products: [{ name: 'كبسة', price: 25 }] }],
      },
    });

    expect(result).toEqual({ id: 'merchant_1', slug: 'store-abc' });
    expect(createPendingMerchantWithInviteMock).toHaveBeenCalledWith({
      name: 'مطعم الذواقة',
      phone: '0911111111',
      address: 'الخرطوم',
      distributorId: 'dist_1',
      businessType: 'RESTAURANT',
      description: 'مطعم شعبي',
      seedTheme: { primaryColor: '#ff0000', welcomeText: 'أهلاً بكم' },
      seedCategories: [{ name: 'وجبات', products: [{ name: 'كبسة', price: 25 }] }],
    });
  });

  it('leaves businessType undefined when the distributor did not pick one', async () => {
    createPendingMerchantWithInviteMock.mockResolvedValue({ id: 'merchant_1', slug: 'store-abc' });
    await createMerchantFromAiContent('dist_1', {
      phone: '0911111111', address: 'الخرطوم',
      content: { name: 'متجر', categories: [{ name: 'فئة', products: [{ name: 'منتج', price: 10 }] }] },
    });
    expect(createPendingMerchantWithInviteMock).toHaveBeenCalledWith(
      expect.objectContaining({ businessType: undefined })
    );
  });
});
