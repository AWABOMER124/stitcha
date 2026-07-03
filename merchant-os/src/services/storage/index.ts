import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local.provider';
import { S3Provider } from './providers/s3.provider';

function createProvider() {
  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    return new S3Provider({
      bucket,
      region: process.env.S3_REGION ?? 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      cdnUrl: process.env.S3_CDN_URL,
    });
  }
  return new LocalStorageProvider();
}

export const storageService = new StorageService(createProvider());

export { StorageService } from './storage.service';
export type { StorageProvider } from './types';
