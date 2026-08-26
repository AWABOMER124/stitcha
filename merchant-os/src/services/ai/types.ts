export type { StoreContentResult } from './store-content.schema';

import type { StoreContentResult } from './store-content.schema';

/**
 * A model/provider that can turn a free-text prompt into a full draft store
 * (name, content, catalog). Swap the provider used by ai-store-content.service
 * to point at a different platform later — nothing else needs to change.
 */
export interface StoreContentProvider {
  generate(prompt: string): Promise<StoreContentResult>;
}
