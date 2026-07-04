import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import type { StorageProvider } from '../types';

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnUrl?: string;
}

export class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.cdnUrl = config.cdnUrl ?? `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string> {
    const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, '') || 'shared';
    const ext = path.extname(filename) || this.extFromMime(mimeType);
    const key = `uploads/${safeScope}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      })
    );

    return key;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  getUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }

  private extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
    };
    return map[mimeType] ?? '';
  }
}
