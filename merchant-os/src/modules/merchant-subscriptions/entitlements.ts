export const FREE_PLAN_CODE = 'FREE';
export const GROWTH_PLAN_CODE = 'GROWTH';
export const PRO_PLAN_CODE = 'PRO';

export interface MerchantEntitlements {
  maxActiveProducts: number;
  maxCategories: number;
  maxStaffUsers: number;
  maxBranches: number;
  customDomain: boolean;
  removeBranding: boolean;
  advancedAnalytics: boolean;
  crmAutomation: boolean;
  dataExport: boolean;
  apiAccess: boolean;
  aiMonthlyCredits: number;
  aiStoreGenerationsLifetime: number;
  aiStoreGenerationsMonthly: number;
  aiStoreEditsMonthly: number;
  aiMerchantChatsMonthly: number;
  aiImageEnhancementsMonthly: number;
  whatsappAiConversationsMonthly: number;
  whatsappAiAgent: boolean;
}

export const FREE_ENTITLEMENTS: MerchantEntitlements = Object.freeze({
  maxActiveProducts: 20,
  maxCategories: 10,
  maxStaffUsers: 1,
  maxBranches: 1,
  customDomain: false,
  removeBranding: false,
  advancedAnalytics: false,
  crmAutomation: false,
  dataExport: false,
  apiAccess: false,
  aiMonthlyCredits: 0,
  aiStoreGenerationsLifetime: 1,
  aiStoreGenerationsMonthly: 0,
  aiStoreEditsMonthly: 0,
  aiMerchantChatsMonthly: 0,
  aiImageEnhancementsMonthly: 0,
  whatsappAiConversationsMonthly: 0,
  whatsappAiAgent: false,
});

export function parseEntitlements(value: unknown): MerchantEntitlements {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...FREE_ENTITLEMENTS };
  }
  const raw = value as Record<string, unknown>;
  return {
    maxActiveProducts: limit(raw.maxActiveProducts, FREE_ENTITLEMENTS.maxActiveProducts),
    maxCategories: limit(raw.maxCategories, FREE_ENTITLEMENTS.maxCategories),
    maxStaffUsers: limit(raw.maxStaffUsers, FREE_ENTITLEMENTS.maxStaffUsers),
    maxBranches: limit(raw.maxBranches, FREE_ENTITLEMENTS.maxBranches),
    customDomain: raw.customDomain === true,
    removeBranding: raw.removeBranding === true,
    advancedAnalytics: raw.advancedAnalytics === true,
    crmAutomation: raw.crmAutomation === true,
    dataExport: raw.dataExport === true,
    apiAccess: raw.apiAccess === true,
    aiMonthlyCredits: limit(raw.aiMonthlyCredits, FREE_ENTITLEMENTS.aiMonthlyCredits),
    aiStoreGenerationsLifetime: limit(raw.aiStoreGenerationsLifetime, FREE_ENTITLEMENTS.aiStoreGenerationsLifetime),
    aiStoreGenerationsMonthly: limit(raw.aiStoreGenerationsMonthly, FREE_ENTITLEMENTS.aiStoreGenerationsMonthly),
    aiStoreEditsMonthly: limit(raw.aiStoreEditsMonthly, FREE_ENTITLEMENTS.aiStoreEditsMonthly),
    aiMerchantChatsMonthly: limit(raw.aiMerchantChatsMonthly, FREE_ENTITLEMENTS.aiMerchantChatsMonthly),
    aiImageEnhancementsMonthly: limit(raw.aiImageEnhancementsMonthly, FREE_ENTITLEMENTS.aiImageEnhancementsMonthly),
    whatsappAiConversationsMonthly: limit(raw.whatsappAiConversationsMonthly, FREE_ENTITLEMENTS.whatsappAiConversationsMonthly),
    whatsappAiAgent: raw.whatsappAiAgent === true,
  };
}

function limit(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -1
    ? value
    : fallback;
}
