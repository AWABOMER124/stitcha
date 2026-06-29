/**
 * @module auth
 * @description Barrel export for the authentication module.
 */

export { handlers, signIn, signOut, auth } from './config';
export {
  getCurrentUser,
  getCurrentMerchant,
  requireAuth,
  requireMerchant,
} from './session';
export type { SessionUser, MerchantContext } from './session';
export { withAuth, withPermission, withMerchant } from './guards';
