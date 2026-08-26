import type { PrivateStorageProvider, PrivateStoredFile } from './types';
import { ValidationError } from '@/lib/errors';

const MAX_PRIVATE_FILE_SIZE = 10 * 1024 * 1024;
const PRIVATE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/** Storage boundary for receipts, payment proofs, POD, and other non-public merchant data. */
export class PrivateStorageService {
  constructor(private readonly provider: PrivateStorageProvider) {}

  async upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string> {
    if (!PRIVATE_MIME_TYPES.has(mimeType)) {
      throw new ValidationError('Private file must be a JPEG, PNG, WebP, or PDF');
    }
    if (file.length === 0 || file.length > MAX_PRIVATE_FILE_SIZE) {
      throw new ValidationError('Private file must be between 1 byte and 10MB');
    }
    if (!scope.trim()) throw new ValidationError('Private upload scope is required');
    return this.provider.upload(file, filename, mimeType, scope);
  }

  async download(path: string): Promise<PrivateStoredFile> {
    if (!this.isPrivatePath(path)) throw new ValidationError('Invalid private file path');
    return await this.provider.download(path);
  }

  async delete(path: string): Promise<void> {
    if (!this.isPrivatePath(path)) throw new ValidationError('Invalid private file path');
    await this.provider.delete(path);
  }

  private isPrivatePath(path: string): boolean {
    return path.startsWith('private/') && !path.includes('..') && !path.includes('\\');
  }
}
