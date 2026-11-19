-- Additive migration: current merchants and all existing plan prices remain unchanged.
ALTER TABLE "merchants" ADD COLUMN "subscriptionMarket" TEXT NOT NULL DEFAULT 'SD';
ALTER TABLE "merchants" ADD CONSTRAINT merchant_subscription_market_valid CHECK ("subscriptionMarket" IN ('SD','SA'));
ALTER TABLE "merchant_plans" ADD COLUMN "isMarketPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "merchant_plan_change_requests"
  ADD COLUMN "billingInterval" "SubscriptionBillingInterval" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "quotedAmount" DECIMAL(10,2),
  ADD COLUMN "quotedCurrency" TEXT;

-- Saudi tiers use existing capabilities; Business raises supported quotas only.
INSERT INTO "merchant_plans" ("id","code","name","description","monthlyPrice","yearlyPrice","currency","entitlements","isPublic","isMarketPublic","isActive","sortOrder","createdAt","updatedAt")
SELECT 'merchant_plan_sa_' || lower(t.tier), 'SA_' || t.tier, t.name,
       'السوق السعودي — ' || t.name, t.monthly, t.yearly, 'SAR',
       CASE WHEN t.tier='BUSINESS' THEN p."entitlements"::jsonb ||
       '{"maxActiveProducts":5000,"maxCategories":200,"maxStaffUsers":20,"maxBranches":5,"aiMonthlyCredits":1000,"aiStoreGenerationsMonthly":40,"aiStoreEditsMonthly":1000,"aiMerchantChatsMonthly":4000,"aiImageEnhancementsMonthly":200,"whatsappAiConversationsMonthly":4000}'::jsonb
       ELSE p."entitlements"::jsonb END,
       false, true, true, t.position, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('GROWTH','نمو',49,490,1,'GROWTH'), ('PRO','احترافي',99,990,2,'PRO'), ('BUSINESS','أعمال',199,1990,3,'PRO'))
     AS t(tier,name,monthly,yearly,position,source)
JOIN "merchant_plans" p ON p.code=t.source;
