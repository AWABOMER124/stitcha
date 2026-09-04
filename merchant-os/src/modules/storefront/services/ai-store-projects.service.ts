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

export async function getMerchantAiStoreProjectLink(merchantId: string, projectId: string) {
  const project = await prisma.merchantAiStoreProject.findFirst({
    where: { id: projectId, merchantId },
    select: { id: true, gatewayProjectId: true },
  });
  if (!project) throw new NotFoundError('AiStoreProject');
  if (!project.gatewayProjectId) throw new BusinessRuleError('هذه المسودة أُنشئت قبل ربط AI Core ولا تدعم التعديل الذكي');
  return { projectId: project.id, gatewayProjectId: project.gatewayProjectId };
}

export async function getMerchantAiStoreVersionLink(merchantId: string, versionId: string) {
  const version = await prisma.merchantAiStoreVersion.findFirst({
    where: { id: versionId, project: { merchantId } },
    include: { project: { select: { id: true, gatewayProjectId: true } } },
  });
  if (!version) throw new NotFoundError('AiStoreVersion');
  if (!version.gatewayVersionId || !version.project.gatewayProjectId) {
    throw new BusinessRuleError('هذا الإصدار لا يدعم الاستعادة عبر AI Core');
  }
  return {
    projectId: version.project.id,
    gatewayProjectId: version.project.gatewayProjectId,
    gatewayVersionId: version.gatewayVersionId,
  };
}

export async function saveAiStoreProjectVersion(input: {
  merchantId: string;
  projectId: string;
  gatewayVersionId: string;
  versionNumber: number;
  content: AiStoreDraft['content'];
}): Promise<AiStoreDraft> {
  return prisma.$transaction(async (tx) => {
    const project = await tx.merchantAiStoreProject.findFirst({ where: { id: input.projectId, merchantId: input.merchantId }, select: { id: true } });
    if (!project) throw new NotFoundError('AiStoreProject');
    const version = await tx.merchantAiStoreVersion.create({
      data: {
        projectId: project.id,
        gatewayVersionId: input.gatewayVersionId,
        versionNumber: input.versionNumber,
        content: input.content as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.merchantAiStoreProject.update({ where: { id: project.id }, data: { currentVersionNumber: input.versionNumber } });
    return {
      projectId: project.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      content: input.content,
      status: version.status,
      createdAt: version.createdAt,
    };
  });
}

export async function claimAiStoreDraftForApplication(merchantId: string, versionId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.merchantAiStoreVersion.findFirst({
      where: { id: versionId, project: { merchantId } },
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
