/**
 * @module S3Provider
 * @description Stub S3 storage provider — not yet implemented.
 * TODO: Integrate with AWS SDK v3 (@aws-sdk/client-s3).
 */

import type { StorageProvider } from '../types';

export class S3Provider implements StorageProvider {
  // TODO: Accept S3 configuration (bucket, region, credentials)
  // constructor(private config: S3Config) {}

  async upload(_file: Buffer, _filename: string, _mimeType: string): Promise<string> {
    // TODO: Implement S3 upload using @aws-sdk/client-s3
    // 1. Create PutObjectCommand with bucket, key, body, content-type
    // 2. Send via S3Client
    // 3. Return the public URL or signed URL
    throw new Error('S3Provider.upload() is not implemented. Install @aws-sdk/client-s3 and configure credentials.');
  }

  async delete(_path: string): Promise<void> {
    // TODO: Implement S3 delete using DeleteObjectCommand
    throw new Error('S3Provider.delete() is not implemented. Install @aws-sdk/client-s3 and configure credentials.');
  }

  getUrl(_path: string): string {
    // TODO: Return CloudFront or S3 bucket URL
    // Example: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${path}`
    throw new Error('S3Provider.getUrl() is not implemented. Install @aws-sdk/client-s3 and configure credentials.');
  }
}
