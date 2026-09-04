import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = { $queryRaw: vi.fn() };
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { GET } = await import('./route');
const previousRelease = process.env.APP_RELEASE;
const previousBucket = process.env.S3_BUCKET;
const previousPersistent = process.env.PUBLIC_UPLOADS_PERSISTENT;
const previousS3Secret = process.env.S3_SECRET_KEY;

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
});

describe('GET /api/health', () => {
  it('returns database readiness and the deployed release identifier', async () => {
    process.env.APP_RELEASE = '9013ebf';
    process.env.PUBLIC_UPLOADS_PERSISTENT = 'true';
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', release: '9013ebf', storage: { provider: 'local', durabilityDeclared: true } });
    expect(response.headers.get('cache-control')).toBe('no-store');
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
