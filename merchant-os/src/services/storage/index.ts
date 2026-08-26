import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local.provider';
import { S3Provider } from './providers/s3.provider';

function createProvider() {
  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      throw new Error('S3_ACCESS_KEY and S3_SECRET_KEY are required when S3_BUCKET is configured');
    }
    if (process.env.S3_ENDPOINT && !process.env.S3_CDN_URL) {
      throw new Error('S3_CDN_URL is required when S3_ENDPOINT is configured');
    }
    return new S3Provider({
      bucket,
      region: process.env.S3_REGION ?? 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      cdnUrl: process.env.S3_CDN_URL,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }
  return new LocalStorageProvider();
}

export const storageService = new StorageService(createProvider());

export { StorageService } from './storage.service';
export type { StorageProvider } from './types';
