/**
 * Merchants Module — Public API
 *
 * This barrel export exposes only the public surface:
 * - Server actions (entry points from UI)
 * - Service functions (for cross-module calls)
 * - Types and schemas
 */

// Server actions
export {
  getMerchantAction,
  createMerchantAction,
  updateMerchantAction,
  updateMerchantStatusAction,
} from './actions';

// Service layer (for cross-module usage)
export {
  getMerchant,
  getMerchantBySlug,
  listMerchants,
  createMerchant,
  updateMerchant,
  updateMerchantStatus,
} from './services/merchants.service';

// Schemas
export {
  createMerchantSchema,
  updateMerchantSchema,
  merchantSettingsSchema,
} from './schemas/merchants.schemas';

// Types
export type {
  CreateMerchantPayload,
  MerchantSettingsPayload,
  MerchantWithStats,
} from './types';
export type { Merchant, MerchantStatus, BusinessType } from './types';
