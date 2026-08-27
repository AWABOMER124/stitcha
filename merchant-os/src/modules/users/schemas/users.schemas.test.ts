import { describe, expect, it } from 'vitest';
import { inviteUserSchema } from './users.schemas';

describe('merchant staff invitation roles', () => {
  it('accepts merchant staff roles', () => {
    expect(inviteUserSchema.safeParse({ email: 'staff@example.com', role: 'CASHIER' }).success).toBe(true);
  });

  it('rejects platform and legacy distributor roles', () => {
    expect(inviteUserSchema.safeParse({ email: 'attacker@example.com', role: 'PLATFORM_OWNER' }).success).toBe(false);
    expect(inviteUserSchema.safeParse({ email: 'legacy@example.com', role: 'DISTRIBUTOR_ADMIN' }).success).toBe(false);
  });
});
