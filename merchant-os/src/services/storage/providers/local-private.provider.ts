import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PrivateStorageProvider } from '../types';

const PRIVATE_ROOT = path.join(process.cwd(), 'storage', 'private');

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '') || 'shared';
}

function resolvePrivatePath(key: string): string {
  const normalizedKey = key.replaceAll('\\', '/');
  if (!normalizedKey.startsWith('private/') || normalizedKey.includes('../')) throw new Error('Invalid private storage key');
  const relative = normalizedKey.slice('private/'.length);
  const resolved = path.resolve(PRIVATE_ROOT, relative);
  if (!resolved.startsWith(`${path.resolve(PRIVATE_ROOT)}${path.sep}`)) throw new Error('Invalid private storage key');
  return resolved;
}

export class LocalPrivateStorageProvider implements PrivateStorageProvider {
  async upload(file: Buffer, _filename: string, mimeType: string, scope: string): Promise<string> {
    const safeScope = safeSegment(scope);
    const directory = path.join(PRIVATE_ROOT, safeScope);
    await fs.mkdir(directory, { recursive: true });
    const extension = this.extensionFor(mimeType);
    const uniqueName = `${Date.now()}-${randomUUID()}${extension}`;
    await fs.writeFile(path.join(directory, uniqueName), file, { flag: 'wx' });
    return `private/${safeScope}/${uniqueName}`;
  }

  async download(key: string) {
    const absolutePath = resolvePrivatePath(key);
    const [body, stat] = await Promise.all([fs.readFile(absolutePath), fs.stat(absolutePath)]);
    return { body, size: stat.size, mimeType: this.mimeFor(path.extname(absolutePath).toLowerCase()) };
  }

  async delete(key: string): Promise<void> {
    try { await fs.unlink(resolvePrivatePath(key)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private extensionFor(mimeType: string) {
    return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' } as Record<string, string>)[mimeType] ?? '';
  }

  private mimeFor(extension: string) {
    return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' } as Record<string, string>)[extension] ?? 'application/octet-stream';
  }
}
