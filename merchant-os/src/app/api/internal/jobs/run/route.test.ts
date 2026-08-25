import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runScheduledJobs = vi.fn();
vi.mock('@/services/jobs/job-runner', () => ({ runScheduledJobs }));

const { POST } = await import('./route');

describe('POST /api/internal/jobs/run', () => {
  const secret = 'job-runner-secret-that-is-at-least-32-characters';

  beforeEach(() => {
    runScheduledJobs.mockReset().mockResolvedValue({
      claimed: 1,
      completed: 1,
      retried: 0,
      failed: 0,
    });
    delete process.env.JOB_RUNNER_SECRET;
  });

  afterEach(() => delete process.env.JOB_RUNNER_SECRET);

  it('fails closed when the runner secret is not configured', async () => {
    const response = await POST(new Request('http://localhost/api/internal/jobs/run', { method: 'POST' }));
    expect(response.status).toBe(503);
    expect(runScheduledJobs).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer secret', async () => {
    process.env.JOB_RUNNER_SECRET = secret;
    const response = await POST(new Request('http://localhost/api/internal/jobs/run', {
      method: 'POST',
      headers: { authorization: 'Bearer incorrect' },
    }));
    expect(response.status).toBe(401);
    expect(runScheduledJobs).not.toHaveBeenCalled();
  });

  it('runs one durable batch for a valid bearer secret', async () => {
    process.env.JOB_RUNNER_SECRET = secret;
    const response = await POST(new Request('http://localhost/api/internal/jobs/run', {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      result: { claimed: 1, completed: 1 },
    });
    expect(runScheduledJobs).toHaveBeenCalledOnce();
  });
});
