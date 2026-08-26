import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('retired distributor registration', () => {
  it('returns a permanent gone response without creating records', async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('retired'),
    });
  });
});
