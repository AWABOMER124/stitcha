import {
  AiCoreStoreContentProvider,
  isAiCoreEnabledForTenant,
  isAiCoreStoreGenerationConfigured,
  type AiCoreStoreGenerationContext,
} from './providers/ai-core-store-content.provider';
import type { StoreContentResult } from './types';
import { storeGenerationPromptSchema } from './store-content.schema';
import type { AiProviderUsage } from '@/modules/ai-usage';
import { BusinessRuleError } from '@/lib/errors';

export interface GeneratedStoreContent {
  content: StoreContentResult;
  usage: AiProviderUsage;
  project?: {
    gatewayProjectId: string;
    gatewayVersionId: string;
    versionNumber: number;
  };
}

export async function generateStoreContentWithMetadata(
  prompt: string,
  context?: AiCoreStoreGenerationContext,
): Promise<GeneratedStoreContent> {
  const safePrompt = storeGenerationPromptSchema.parse(prompt);
  if (!context || !isAiCoreStoreGenerationConfigured() || !isAiCoreEnabledForTenant(context.merchantId)) throw new BusinessRuleError('توليد المتجر متاح فقط عبر بوابة الذكاء الاصطناعي الخاصة بوصلة');
  const generated = await new AiCoreStoreContentProvider().generate(safePrompt, context);
  return {
    content: generated.content,
    project: { gatewayProjectId: generated.projectId, gatewayVersionId: generated.versionId, versionNumber: generated.versionNumber },
    usage: { provider: 'ai-core', providerRequestId: generated.requestId, metadata: { projectId: generated.projectId, versionId: generated.versionId, versionNumber: generated.versionNumber } },
  };
}

/** Generates a full draft store (name, content, catalog) from a free-text prompt. */
export async function generateStoreContent(prompt: string): Promise<StoreContentResult> {
  return (await generateStoreContentWithMetadata(prompt)).content;
}
