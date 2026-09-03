export const FREE_PLAN_CODE = 'FREE';
export const PRO_PLAN_CODE = 'PRO';

export interface MerchantEntitlements {
  maxActiveProducts: number;
  maxStaffUsers: number;
  maxBranches: number;
  customDomain: boolean;
  removeBranding: boolean;
  advancedAnalytics: boolean;
  crmAutomation: boolean;
  dataExport: boolean;
  apiAccess: boolean;
  aiMonthlyCredits: number;
  whatsappAiAgent: boolean;
}

export const FREE_ENTITLEMENTS: MerchantEntitlements = Object.freeze({
  maxActiveProducts: 20,
  maxStaffUsers: 1,
  maxBranches: 1,
  customDomain: false,
  removeBranding: false,
  advancedAnalytics: false,
  crmAutomation: false,
  dataExport: false,
  apiAccess: false,
  aiMonthlyCredits: 0,
  whatsappAiAgent: false,
});

export function parseEntitlements(value: unknown): MerchantEntitlements {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...FREE_ENTITLEMENTS };
  }
  const raw = value as Record<string, unknown>;
  return {
    maxActiveProducts: limit(raw.maxActiveProducts, FREE_ENTITLEMENTS.maxActiveProducts),
    maxStaffUsers: limit(raw.maxStaffUsers, FREE_ENTITLEMENTS.maxStaffUsers),
    maxBranches: limit(raw.maxBranches, FREE_ENTITLEMENTS.maxBranches),
    customDomain: raw.customDomain === true,
    removeBranding: raw.removeBranding === true,
    advancedAnalytics: raw.advancedAnalytics === true,
    crmAutomation: raw.crmAutomation === true,
    dataExport: raw.dataExport === true,
    apiAccess: raw.apiAccess === true,
    aiMonthlyCredits: limit(raw.aiMonthlyCredits, FREE_ENTITLEMENTS.aiMonthlyCredits),
    whatsappAiAgent: raw.whatsappAiAgent === true,
  };
}

function limit(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -1
    ? value
    : fallback;
}
