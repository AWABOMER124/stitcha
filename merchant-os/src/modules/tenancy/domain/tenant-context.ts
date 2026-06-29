/**
 * TenantContext — provides scoped query helpers for multi-tenant data access.
 */
export interface TenantContext {
  merchantId: string;
  scope<T extends Record<string, unknown>>(where: T): T & { merchantId: string };
}

/** Create a tenant context for a given merchantId */
export function createTenantContext(merchantId: string): TenantContext {
  return {
    merchantId,
    scope<T extends Record<string, unknown>>(where: T): T & { merchantId: string } {
      return { ...where, merchantId };
    },
  };
}

/** Execute a function within a tenant scope */
export async function withTenantScope<T>(
  merchantId: string,
  fn: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  const ctx = createTenantContext(merchantId);
  return fn(ctx);
}
