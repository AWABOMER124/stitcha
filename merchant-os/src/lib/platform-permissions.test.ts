import { describe, expect, it } from 'vitest';
import { hasPlatformPermission, isPlatformRole, PLATFORM_PERMISSIONS } from './platform-permissions';

describe('platform role permissions', () => {
  it('keeps platform user management owner-only', () => {
    expect(hasPlatformPermission('PLATFORM_OWNER', PLATFORM_PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPlatformPermission('PLATFORM_ADMIN', PLATFORM_PERMISSIONS.USERS_MANAGE)).toBe(false);
  });

  it('separates operations, finance, and support duties', () => {
    expect(hasPlatformPermission('PLATFORM_OPERATIONS', PLATFORM_PERMISSIONS.DELIVERY_MANAGE)).toBe(true);
    expect(hasPlatformPermission('PLATFORM_OPERATIONS', PLATFORM_PERMISSIONS.PAYMENTS_REVIEW)).toBe(false);
    expect(hasPlatformPermission('PLATFORM_FINANCE', PLATFORM_PERMISSIONS.PAYMENTS_REVIEW)).toBe(true);
    expect(hasPlatformPermission('PLATFORM_FINANCE', PLATFORM_PERMISSIONS.DELIVERY_MANAGE)).toBe(false);
    expect(hasPlatformPermission('PLATFORM_SUPPORT', PLATFORM_PERMISSIONS.MERCHANTS_READ)).toBe(true);
    expect(hasPlatformPermission('PLATFORM_SUPPORT', PLATFORM_PERMISSIONS.MERCHANTS_MANAGE)).toBe(false);
  });

  it('recognizes every platform staff role without treating merchant roles as platform roles', () => {
    expect(isPlatformRole('PLATFORM_SUPPORT')).toBe(true);
    expect(isPlatformRole('MERCHANT_OWNER')).toBe(false);
  });
});
