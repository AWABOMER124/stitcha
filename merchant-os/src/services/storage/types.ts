export interface StorageProvider {
  /** `scope` is a caller-controlled path prefix (e.g. a merchantId) used to isolate uploads per tenant. */
  upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export interface PrivateStoredFile {
  body: Uint8Array;
  mimeType: string;
  size: number;
}

/** Private files never expose an origin/CDN URL. Callers authorize access first, then stream `download()`. */
export interface PrivateStorageProvider {
  upload(file: Buffer, filename: string, mimeType: string, scope: string): Promise<string>;
  download(path: string): Promise<PrivateStoredFile>;
  delete(path: string): Promise<void>;
}
