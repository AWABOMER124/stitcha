import { afterEach, describe, expect, it, vi } from 'vitest';

const prismaMock = { $queryRaw: vi.fn() };
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { GET } = await import('./route');
const previousRelease = process.env.APP_RELEASE;

afterEach(() => {
  prismaMock.$queryRaw.mockReset();
  if (previousRelease === undefined) delete process.env.APP_RELEASE;
  else process.env.APP_RELEASE = previousRelease;
});

describe('GET /api/health', () => {
  it('returns database readiness and the deployed release identifier', async () => {
    process.env.APP_RELEASE = '9013ebf';
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', release: '9013ebf' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 503 without leaking the database error', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('postgres password leaked here'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unhealthy' });
  });
});
