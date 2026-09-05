import { ClaudeStoreContentProvider } from './providers/claude.provider';
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
  const aiCoreRequested = Boolean(process.env.AI_CORE_BASE_URL || process.env.AI_CORE_SECRET_WASLA);
  if (aiCoreRequested && (!isAiCoreStoreGenerationConfigured() || !context)) {
    throw new BusinessRuleError('إعداد تكامل AI Core غير مكتمل');
  }
  if (context && isAiCoreStoreGenerationConfigured() && isAiCoreEnabledForTenant(context.merchantId)) {
    const generated = await new AiCoreStoreContentProvider().generate(safePrompt, context);
    return {
      content: generated.content,
      project: {
        gatewayProjectId: generated.projectId,
        gatewayVersionId: generated.versionId,
        versionNumber: generated.versionNumber,
      },
      usage: {
        provider: 'ai-core',
        providerRequestId: generated.requestId,
        metadata: {
          projectId: generated.projectId,
          versionId: generated.versionId,
          versionNumber: generated.versionNumber,
        },
      },
    };
  }

  const content = await new ClaudeStoreContentProvider().generate(safePrompt);
  return { content, usage: { provider: 'anthropic-direct', model: 'claude-haiku-4-5-20251001' } };
}

/** Generates a full draft store (name, content, catalog) from a free-text prompt. */
export async function generateStoreContent(prompt: string): Promise<StoreContentResult> {
  return (await generateStoreContentWithMetadata(prompt)).content;
}
