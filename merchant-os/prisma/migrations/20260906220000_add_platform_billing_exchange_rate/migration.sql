CREATE TABLE "platform_billing_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "usdToSdgRate" DECIMAL(14,2) NOT NULL DEFAULT 100000,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_billing_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_billing_settings" ("id", "usdToSdgRate", "updatedAt")
VALUES ('default', 100000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
