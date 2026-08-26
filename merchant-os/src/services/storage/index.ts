import { StorageService } from './storage.service';
import { PrivateStorageService } from './private-storage.service';
import { LocalStorageProvider } from './providers/local.provider';
import { LocalPrivateStorageProvider } from './providers/local-private.provider';
import { S3Provider } from './providers/s3.provider';
import { S3PrivateStorageProvider } from './providers/s3-private.provider';

function createPublicProvider() {
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

function createPrivateProvider() {
  const bucket = process.env.PRIVATE_S3_BUCKET;
  if (!bucket) return new LocalPrivateStorageProvider();
  const accessKeyId = process.env.PRIVATE_S3_ACCESS_KEY ?? process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.PRIVATE_S3_SECRET_KEY ?? process.env.S3_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Private S3 access and secret keys are required when PRIVATE_S3_BUCKET is configured');
  }
  return new S3PrivateStorageProvider({
    bucket,
    region: process.env.PRIVATE_S3_REGION ?? process.env.S3_REGION ?? 'us-east-1',
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.PRIVATE_S3_ENDPOINT ?? process.env.S3_ENDPOINT,
    forcePathStyle: (process.env.PRIVATE_S3_FORCE_PATH_STYLE ?? process.env.S3_FORCE_PATH_STYLE) === 'true',
  });
}

export const publicStorageService = new StorageService(createPublicProvider());
/** Backwards-compatible alias used by existing public product/storefront uploads. */
export const storageService = publicStorageService;
export const privateStorageService = new PrivateStorageService(createPrivateProvider());

export { StorageService } from './storage.service';
export { PrivateStorageService } from './private-storage.service';
export type { StorageProvider, PrivateStorageProvider, PrivateStoredFile } from './types';
