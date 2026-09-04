import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  merchantAiStoreProject: { create: vi.fn() },
  merchantAiStoreVersion: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)),
};
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const service = await import('./ai-store-projects.service');
const content = {
  name: 'متجر الاختبار', slogan: 'كل ما تحتاجه', description: 'متجر سوداني متكامل',
  welcomeText: 'مرحباً بكم', primaryColor: '#13C4A3',
  categories: [{ name: 'عام', products: [{ name: 'منتج', description: 'وصف', price: 1000 }] }],
};

describe('AI store project persistence', () => {
  beforeEach(() => {
    for (const group of [prismaMock.merchantAiStoreProject, prismaMock.merchantAiStoreVersion]) {
      Object.values(group).forEach((fn) => fn.mockReset());
    }
    prismaMock.$transaction.mockClear();
  });

  it('persists AI Core linkage and the generated payload', async () => {
    prismaMock.merchantAiStoreProject.create.mockResolvedValue({
      id: 'local_project', versions: [{ id: 'local_version', status: 'DRAFT', createdAt: new Date('2026-09-04') }],
    });
    await expect(service.saveGeneratedAiStoreProject({
      merchantId: 'merchant_1', actorId: 'user_1', prompt: 'أنشئ متجر',
      generated: {
        content, usage: { provider: 'ai-core', providerRequestId: 'request_1' },
        project: { gatewayProjectId: 'gateway_project', gatewayVersionId: 'gateway_version', versionNumber: 2 },
      },
    })).resolves.toMatchObject({ projectId: 'local_project', versionId: 'local_version', versionNumber: 2 });
    expect(prismaMock.merchantAiStoreProject.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      merchantId: 'merchant_1', gatewayProjectId: 'gateway_project', currentVersionNumber: 2,
    }) }));
  });

  it('only claims a draft belonging to the current merchant', async () => {
    prismaMock.merchantAiStoreVersion.findFirst.mockResolvedValue({ id: 'version_1', content, status: 'DRAFT' });
    prismaMock.merchantAiStoreVersion.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.claimAiStoreDraftForApplication('merchant_1', 'project_1')).resolves.toMatchObject({ versionId: 'version_1' });
    expect(prismaMock.merchantAiStoreVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 'project_1', project: { merchantId: 'merchant_1' } },
    }));
  });

  it('blocks repeated or concurrent application', async () => {
    prismaMock.merchantAiStoreVersion.findFirst.mockResolvedValue({ id: 'version_1', content, status: 'DRAFT' });
    prismaMock.merchantAiStoreVersion.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.claimAiStoreDraftForApplication('merchant_1', 'project_1')).rejects.toThrow('بالفعل');
  });

  it('records a partial application when any generated catalog item fails', async () => {
    prismaMock.merchantAiStoreVersion.update.mockResolvedValue({ id: 'version_1' });
    await expect(service.finishAiStoreDraftApplication('version_1', {
      categoriesCreated: 1, productsCreated: 1, categoriesRequested: 1, productsRequested: 2,
    })).resolves.toBe('PARTIAL');
    expect(prismaMock.merchantAiStoreVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PARTIAL' }),
    }));
  });
});
