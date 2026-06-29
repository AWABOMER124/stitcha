/**
 * @module StorageService
 * @description Wraps a StorageProvider to provide a clean upload/delete/URL API.
 * The active provider (local, S3, etc.) is injected at construction time.
 */

import type { StorageProvider } from './types';

export class StorageService {
  constructor(private provider: StorageProvider) {}

  /**
   * Upload a file and return the path/URL.
   */
  async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    return this.provider.upload(file, filename, mimeType);
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
