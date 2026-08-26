import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { PrivateStorageProvider } from '../types';

export interface PrivateS3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3PrivateStorageProvider implements PrivateStorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: PrivateS3Config) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async upload(file: Buffer, _filename: string, mimeType: string, scope: string): Promise<string> {
    const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, '') || 'shared';
    const extension = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' } as Record<string, string>)[mimeType] ?? '';
    const key = `private/${safeScope}/${Date.now()}-${randomUUID()}${extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
      CacheControl: 'private, no-store',
    }));
    return key;
  }

  async download(key: string) {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (!object.Body) throw new Error('Private file body is missing');
    const body = await object.Body.transformToByteArray();
    return {
      body,
      size: object.ContentLength ?? body.byteLength,
      mimeType: object.ContentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}
