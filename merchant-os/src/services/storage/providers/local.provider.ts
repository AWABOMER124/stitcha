/**
 * @module LocalStorageProvider
 * @description Saves uploaded files to the local `public/uploads/` directory.
 * Suitable for development and small deployments.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageProvider } from '../types';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export class LocalStorageProvider implements StorageProvider {
  /**
   * Upload a file to local storage.
   * @returns The relative URL path to the uploaded file (e.g. `/uploads/abc123.jpg`).
   */
  async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    // Ensure the uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Generate a unique filename to avoid collisions
    const ext = path.extname(filename) || this.getExtFromMimeType(mimeType);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    await fs.writeFile(filePath, file);
    console.log(`[LocalStorage] File saved: ${filePath}`);

    return `/uploads/${uniqueName}`;
  }

  /**
   * Delete a file from local storage.
   * @param filePath The relative URL path (e.g. `/uploads/abc123.jpg`).
   */
  async delete(filePath: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), 'public', filePath);

    try {
      await fs.unlink(absolutePath);
      console.log(`[LocalStorage] File deleted: ${absolutePath}`);
    } catch (error) {
      // File may already be deleted — don't throw
      console.warn(`[LocalStorage] Could not delete file: ${absolutePath}`, error);
    }
  }

  /**
   * Get the public URL for a stored file.
   * @param filePath The relative URL path (e.g. `/uploads/abc123.jpg`).
   */
  getUrl(filePath: string): string {
    return filePath;
  }

  /** Fallback extension lookup from MIME type. */
  private getExtFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '';
  }
}
