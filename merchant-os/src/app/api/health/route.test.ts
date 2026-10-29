import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = { $queryRaw: vi.fn() };
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { GET } = await import('./route');
const previousRelease = process.env.APP_RELEASE;
const previousBucket = process.env.S3_BUCKET;
const previousPersistent = process.env.PUBLIC_UPLOADS_PERSISTENT;
const previousS3Secret = process.env.S3_SECRET_KEY;
const previousResend = process.env.RESEND_API_KEY;
const previousEmailFrom = process.env.EMAIL_FROM;
const previousAiCoreBaseUrl = process.env.AI_CORE_BASE_URL;
const previousAiCoreSecret = process.env.AI_CORE_SECRET_WASLA;
const previousImageEnhancement = process.env.AI_IMAGE_ENHANCEMENT_ENABLED;

afterEach(() => {
  prismaMock.$queryRaw.mockReset();
  if (previousRelease === undefined) delete process.env.APP_RELEASE;
  else process.env.APP_RELEASE = previousRelease;
  if (previousBucket === undefined) delete process.env.S3_BUCKET;
  else process.env.S3_BUCKET = previousBucket;
  if (previousPersistent === undefined) delete process.env.PUBLIC_UPLOADS_PERSISTENT;
  else process.env.PUBLIC_UPLOADS_PERSISTENT = previousPersistent;
  if (previousS3Secret === undefined) delete process.env.S3_SECRET_KEY;
  else process.env.S3_SECRET_KEY = previousS3Secret;
  if (previousResend === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previousResend;
  if (previousEmailFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = previousEmailFrom;
  if (previousAiCoreBaseUrl === undefined) delete process.env.AI_CORE_BASE_URL;
  else process.env.AI_CORE_BASE_URL = previousAiCoreBaseUrl;
  if (previousAiCoreSecret === undefined) delete process.env.AI_CORE_SECRET_WASLA;
  else process.env.AI_CORE_SECRET_WASLA = previousAiCoreSecret;
  if (previousImageEnhancement === undefined) delete process.env.AI_IMAGE_ENHANCEMENT_ENABLED;
  else process.env.AI_IMAGE_ENHANCEMENT_ENABLED = previousImageEnhancement;
});

describe('GET /api/health', () => {
  it('returns database readiness and the deployed release identifier', async () => {
    process.env.APP_RELEASE = '9013ebf';
    process.env.PUBLIC_UPLOADS_PERSISTENT = 'true';
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'WASLA <no-reply@example.com>';
    process.env.AI_CORE_BASE_URL = 'https://ai.example.test';
    process.env.AI_CORE_SECRET_WASLA = 'test-secret';
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      readiness: 'ready',
      release: '9013ebf',
      storage: { provider: 'local', durabilityDeclared: true },
      checks: { database: true, releaseIdentified: true, durableStorage: true, emailDelivery: true, aiCore: true },
      capabilities: { aiCore: true },
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('reports degraded readiness without exposing missing configuration values', async () => {
    process.env.APP_RELEASE = 'unknown';
    process.env.PUBLIC_UPLOADS_PERSISTENT = 'false';
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      readiness: 'degraded',
      checks: { database: true, releaseIdentified: false, durableStorage: false, emailDelivery: false },
    });
    expect(JSON.stringify(body)).not.toContain('RESEND_API_KEY');
  });

  it('reports S3 public storage as durable without exposing credentials', async () => {
    process.env.S3_BUCKET = 'wasla-public';
    process.env.S3_SECRET_KEY = 'must-not-leak';
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(await response.json()).toMatchObject({ storage: { provider: 's3', durabilityDeclared: true } });
    expect(JSON.stringify(await GET().then(result => result.json()))).not.toContain('must-not-leak');
  });

  it('returns 503 without leaking the database error', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('postgres password leaked here'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unhealthy' });
  });
});
