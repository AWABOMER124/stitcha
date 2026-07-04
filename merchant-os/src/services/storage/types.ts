export interface StorageProvider {
  /** `scope` is a caller-controlled path prefix (e.g. a merchantId) used to isolate uploads per tenant. */
  upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
