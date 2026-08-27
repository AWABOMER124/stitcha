ALTER TABLE "conversations" ADD COLUMN "aiAgentPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inbox_messages" ADD COLUMN "externalId" TEXT;
ALTER TABLE "whatsapp_configs" ADD COLUMN "aiAgentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_configs" ADD COLUMN "aiAgentPrompt" TEXT;

CREATE UNIQUE INDEX "inbox_messages_externalId_key" ON "inbox_messages"("externalId");

CREATE TABLE "whatsapp_ai_usage" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_ai_usage_merchantId_periodKey_key" ON "whatsapp_ai_usage"("merchantId", "periodKey");
CREATE INDEX "whatsapp_ai_usage_periodKey_idx" ON "whatsapp_ai_usage"("periodKey");
ALTER TABLE "whatsapp_ai_usage" ADD CONSTRAINT "whatsapp_ai_usage_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "merchant_plans"
SET "entitlements" = jsonb_set("entitlements", '{whatsappAiAgent}', 'false'::jsonb, true)
WHERE "code" = 'FREE';

UPDATE "merchant_plans"
SET "entitlements" = jsonb_set("entitlements", '{whatsappAiAgent}', 'true'::jsonb, true)
WHERE "code" = 'PRO';
