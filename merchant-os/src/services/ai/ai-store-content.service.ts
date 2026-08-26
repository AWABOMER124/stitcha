import { ClaudeStoreContentProvider } from './providers/claude.provider';
import type { StoreContentResult } from './types';
import { storeGenerationPromptSchema } from './store-content.schema';

/** Generates a full draft store (name, content, catalog) from a free-text prompt. */
export async function generateStoreContent(prompt: string): Promise<StoreContentResult> {
  const safePrompt = storeGenerationPromptSchema.parse(prompt);
  const provider = new ClaudeStoreContentProvider();
  return provider.generate(safePrompt);
}
