/**
 * @module StorageService
 * @description Wraps a StorageProvider to provide a clean upload/delete/URL API.
 * The active provider (local, S3, etc.) is injected at construction time.
 *
 * Validation (size + MIME whitelist) lives here, not in each provider, so
 * every provider gets the same safety guarantees for free.
 */

import type { StorageProvider } from './types';
import { ValidationError } from '@/lib/errors';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);

export class StorageService {
  constructor(private provider: StorageProvider) {}

  /**
   * Upload a file and return the path/URL.
   * @param scope Path prefix used to isolate uploads per tenant (pass the merchantId).
   */
  async upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string> {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new ValidationError(`File type "${mimeType}" is not allowed`);
    }
    if (file.length > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
    }
    if (!scope) {
      throw new ValidationError('Upload scope (merchantId) is required');
    }
    return this.provider.upload(file, filename, mimeType, scope);
  }

  /**
   * Delete a previously uploaded file.
   */
  async delete(path: string): Promise<void> {
    return this.provider.delete(path);
  }

  /**
   * Get the public-facing URL for a stored file.
   */
  getUrl(path: string): string {
    return this.provider.getUrl(path);
  }
}
