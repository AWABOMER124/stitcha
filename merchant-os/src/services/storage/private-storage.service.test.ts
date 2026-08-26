import { describe, expect, it, vi } from 'vitest';
import { PrivateStorageService } from './private-storage.service';
import type { PrivateStorageProvider } from './types';

function provider(): PrivateStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('private/merchant/file.webp'),
    download: vi.fn().mockResolvedValue({ body: new Uint8Array([1]), mimeType: 'image/webp', size: 1 }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PrivateStorageService', () => {
  it('stores an allowed file without producing a public URL', async () => {
    const target = provider();
    const service = new PrivateStorageService(target);
    await expect(service.upload(Buffer.from('image'), 'receipt.webp', 'image/webp', 'merchant-1')).resolves.toBe('private/merchant/file.webp');
    expect(target.upload).toHaveBeenCalledWith(expect.any(Buffer), 'receipt.webp', 'image/webp', 'merchant-1');
  });

  it('rejects executable and oversized private files', async () => {
    const service = new PrivateStorageService(provider());
    await expect(service.upload(Buffer.from('x'), 'bad.exe', 'application/x-msdownload', 'merchant-1')).rejects.toThrow();
    await expect(service.upload(Buffer.alloc(10 * 1024 * 1024 + 1), 'large.pdf', 'application/pdf', 'merchant-1')).rejects.toThrow();
  });

  it('refuses to read or delete a public/traversal path', async () => {
    const service = new PrivateStorageService(provider());
    await expect(service.download('/uploads/public.webp')).rejects.toThrow();
    await expect(service.delete('../private/receipt.webp')).rejects.toThrow();
    await expect(service.download('private/../uploads/public.webp')).rejects.toThrow();
  });
});
