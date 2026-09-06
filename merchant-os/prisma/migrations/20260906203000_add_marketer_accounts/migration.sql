ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MARKETER';

CREATE TABLE "marketer_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketer_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketer_accounts_userId_key" ON "marketer_accounts"("userId");
ALTER TABLE "marketer_accounts" ADD CONSTRAINT "marketer_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_affiliates" ADD COLUMN "marketerAccountId" TEXT;
CREATE INDEX "store_affiliates_marketerAccountId_status_idx" ON "store_affiliates"("marketerAccountId", "status");
ALTER TABLE "store_affiliates" ADD CONSTRAINT "store_affiliates_marketerAccountId_fkey"
  FOREIGN KEY ("marketerAccountId") REFERENCES "marketer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketer_applications" ADD COLUMN "marketerAccountId" TEXT;
CREATE INDEX "marketer_applications_marketerAccountId_status_createdAt_idx" ON "marketer_applications"("marketerAccountId", "status", "createdAt");
ALTER TABLE "marketer_applications" ADD CONSTRAINT "marketer_applications_marketerAccountId_fkey"
  FOREIGN KEY ("marketerAccountId") REFERENCES "marketer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
