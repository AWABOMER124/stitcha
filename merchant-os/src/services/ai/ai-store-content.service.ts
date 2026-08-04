import { ValidationError } from '@/lib/errors';
import { ClaudeStoreContentProvider } from './providers/claude.provider';
import type { StoreContentResult } from './types';

/** Generates a full draft store (name, content, catalog) from a free-text prompt. */
export async function generateStoreContent(prompt: string): Promise<StoreContentResult> {
  if (!prompt?.trim()) throw new ValidationError('Prompt is required');
  const provider = new ClaudeStoreContentProvider();
  return provider.generate(prompt);
}
