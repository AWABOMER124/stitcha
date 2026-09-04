import type { MerchantEntitlements } from './entitlements';

export const PLAN_LIMIT_FIELDS = [
  'maxActiveProducts', 'maxCategories', 'maxStaffUsers', 'maxBranches', 'aiMonthlyCredits',
  'aiStoreGenerationsLifetime', 'aiStoreGenerationsMonthly', 'aiStoreEditsMonthly',
  'aiMerchantChatsMonthly', 'aiImageEnhancementsMonthly', 'whatsappAiConversationsMonthly',
] as const satisfies readonly (keyof MerchantEntitlements)[];

export const PLAN_BOOLEAN_FIELDS = [
  'customDomain', 'removeBranding', 'advancedAnalytics', 'crmAutomation',
  'dataExport', 'apiAccess', 'whatsappAiAgent',
] as const satisfies readonly (keyof MerchantEntitlements)[];
