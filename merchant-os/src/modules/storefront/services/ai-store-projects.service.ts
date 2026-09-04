import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import type { GeneratedStoreContent } from '@/services/ai/ai-store-content.service';
import { storeContentSchema } from '@/services/ai/store-content.schema';

export interface AiStoreDraft {
  projectId: string;
  versionId: string;
  versionNumber: number;
  content: ReturnType<typeof storeContentSchema.parse>;
  status: 'DRAFT' | 'APPLYING' | 'APPLIED' | 'PARTIAL';
  createdAt: Date;
}

export async function saveGeneratedAiStoreProject(input: {
  merchantId: string;
  actorId?: string;
  prompt: string;
  generated: GeneratedStoreContent;
}): Promise<AiStoreDraft> {
  const versionNumber = input.generated.project?.versionNumber ?? 1;
  const project = await prisma.merchantAiStoreProject.create({
    data: {
      merchantId: input.merchantId,
      gatewayProjectId: input.generated.project?.gatewayProjectId,
      prompt: input.prompt,
      provider: input.generated.usage.provider ?? 'unknown',
      providerRequestId: input.generated.usage.providerRequestId,
      currentVersionNumber: versionNumber,
      createdById: input.actorId,
      versions: {
        create: {
          gatewayVersionId: input.generated.project?.gatewayVersionId,
          versionNumber,
          content: input.generated.content as unknown as Prisma.InputJsonValue,
        },
      },
    },
    include: { versions: true },
  });
  const version = project.versions[0];
  return { projectId: project.id, versionId: version.id, versionNumber, content: input.generated.content, status: version.status, createdAt: version.createdAt };
}

export async function listMerchantAiStoreDrafts(merchantId: string, take = 12): Promise<AiStoreDraft[]> {
  const versions = await prisma.merchantAiStoreVersion.findMany({
    where: { project: { merchantId } },
    include: { project: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
  });
  return versions.flatMap((version) => {
    const content = storeContentSchema.safeParse(version.content);
    return content.success ? [{
      projectId: version.project.id, versionId: version.id, versionNumber: version.versionNumber,
      content: content.data, status: version.status, createdAt: version.createdAt,
    }] : [];
  });
}

export async function claimAiStoreDraftForApplication(merchantId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.merchantAiStoreVersion.findFirst({
      where: { projectId, project: { merchantId } },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version) throw new NotFoundError('AiStoreProject');
    const claimed = await tx.merchantAiStoreVersion.updateMany({
      where: { id: version.id, status: 'DRAFT' }, data: { status: 'APPLYING' },
    });
    if (claimed.count !== 1) throw new BusinessRuleError('تم تطبيق هذه المسودة أو يجري تطبيقها بالفعل');
    return { versionId: version.id, content: storeContentSchema.parse(version.content) };
  });
}

export async function finishAiStoreDraftApplication(versionId: string, summary: {
  categoriesCreated: number;
  productsCreated: number;
  categoriesRequested: number;
  productsRequested: number;
}) {
  const status = summary.categoriesCreated === summary.categoriesRequested
    && summary.productsCreated === summary.productsRequested ? 'APPLIED' as const : 'PARTIAL' as const;
  await prisma.merchantAiStoreVersion.update({
    where: { id: versionId },
    data: { status, appliedAt: new Date(), applicationSummary: summary },
  });
  return status;
}

export async function failAiStoreDraftApplication(versionId: string) {
  await prisma.merchantAiStoreVersion.updateMany({ where: { id: versionId, status: 'APPLYING' }, data: { status: 'DRAFT' } });
}
