/**
 * @module auth/guards
 * @description Higher-order wrappers for server actions that enforce auth and permission gates.
 */

import { getCurrentUser, getCurrentMerchant, type SessionUser, type MerchantContext } from './session';
import { requirePermission } from '@/lib/permissions';
import { handleActionError } from '@/lib/errors';

type ActionFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

/**
 * Wraps a server action so it runs only when the caller is authenticated.
 * The inner function receives the `SessionUser` as its first argument.
 */
export function withAuth<TArgs extends unknown[], TResult>(
  handler: (user: SessionUser, ...args: TArgs) => Promise<TResult>,
): ActionFn<TArgs, TResult | { success: false; error: string }> {
  return async (...args: TArgs) => {
    try {
      const user = await getCurrentUser();
      return await handler(user, ...args);
    } catch (err) {
      return handleActionError(err);
    }
  };
}

/**
 * Wraps a server action with auth + a specific permission check.
 */
export function withPermission<TArgs extends unknown[], TResult>(
  permission: string,
  handler: (user: SessionUser, ...args: TArgs) => Promise<TResult>,
): ActionFn<TArgs, TResult | { success: false; error: string }> {
  return async (...args: TArgs) => {
    try {
      const user = await getCurrentUser();
      requirePermission(
        { userId: user.id, merchantId: user.merchantId ?? '', role: user.role, permissions: [] },
        permission as `${string}:${string}`,
      );
      return await handler(user, ...args);
    } catch (err) {
      return handleActionError(err);
    }
  };
}

/**
 * Wraps a server action with auth + merchant context resolution.
 * The inner function receives both the user and the merchant context.
 */
export function withMerchant<TArgs extends unknown[], TResult>(
  handler: (
    user: SessionUser,
    merchant: MerchantContext,
    ...args: TArgs
  ) => Promise<TResult>,
): ActionFn<TArgs, TResult | { success: false; error: string }> {
  return async (...args: TArgs) => {
    try {
      const user = await getCurrentUser();
      const merchant = await getCurrentMerchant();
      return await handler(user, merchant, ...args);
    } catch (err) {
      return handleActionError(err);
    }
  };
}
