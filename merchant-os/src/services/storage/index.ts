/**
 * @module storage
 * @description Pre-configured storage service singleton using the local filesystem provider.
 * Switch to S3Provider in production by changing the provider here.
 */

import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local.provider';

/** Pre-configured storage service singleton (local filesystem). */
export const storageService = new StorageService(new LocalStorageProvider());

// Re-export types and classes for convenience
export { StorageService } from './storage.service';
export type { StorageProvider } from './types';
