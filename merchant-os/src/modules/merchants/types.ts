import type { Merchant, MerchantStatus, BusinessType } from '@prisma/client';

// ============================================================================
// Merchants Module — Types
// ============================================================================

/** Merchant with computed fields for display */
export interface MerchantWithStats extends Merchant {
  _count?: {
    products: number;
    orders: number;
    users: number;
    branches: number;
  };
}

/** Merchant creation payload (post-validation) */
export interface CreateMerchantPayload {
  name: string;
  slug?: string;
  description?: string;
  businessType: BusinessType;
  phone: string;
  email: string;
  address: string;
  logo?: string;
  coverImage?: string;
}

/** Merchant settings update */
export interface MerchantSettingsPayload {
  currency: string;
  timezone: string;
}

export type { Merchant, MerchantStatus, BusinessType };
