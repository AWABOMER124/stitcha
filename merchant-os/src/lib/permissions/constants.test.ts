import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from './constants';

describe('invoice and export permissions', () => {
  it('allows merchant owners and admins to manage invoices and exports', () => {
    for (const role of ['MERCHANT_OWNER', 'MERCHANT_ADMIN'] as const) {
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.INVOICES.UPDATE);
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.EXPORTS.DOWNLOAD);
    }
  });

  it('allows finance agents to manage invoices and export data', () => {
    expect(ROLE_PERMISSIONS.FINANCE_AGENT).toEqual(expect.arrayContaining([
      PERMISSIONS.INVOICES.CREATE,
      PERMISSIONS.INVOICES.READ,
      PERMISSIONS.INVOICES.UPDATE,
      PERMISSIONS.EXPORTS.DOWNLOAD,
    ]));
  });

  it('does not grant whole-store exports to cashiers', () => {
    expect(ROLE_PERMISSIONS.CASHIER).not.toContain(PERMISSIONS.EXPORTS.DOWNLOAD);
  });
});
