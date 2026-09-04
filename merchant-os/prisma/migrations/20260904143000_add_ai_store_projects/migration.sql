CREATE TYPE "AiStoreVersionStatus" AS ENUM ('DRAFT', 'APPLYING', 'APPLIED', 'PARTIAL');

CREATE TABLE "merchant_ai_store_projects" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "gatewayProjectId" TEXT,
  "prompt" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerRequestId" TEXT,
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_ai_store_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "merchant_ai_store_versions" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "gatewayVersionId" TEXT,
  "versionNumber" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "status" "AiStoreVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "appliedAt" TIMESTAMP(3),
  "applicationSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_ai_store_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_ai_store_projects_gatewayProjectId_key" ON "merchant_ai_store_projects"("gatewayProjectId");
CREATE INDEX "merchant_ai_store_projects_merchantId_createdAt_idx" ON "merchant_ai_store_projects"("merchantId", "createdAt");
CREATE UNIQUE INDEX "merchant_ai_store_versions_gatewayVersionId_key" ON "merchant_ai_store_versions"("gatewayVersionId");
CREATE UNIQUE INDEX "merchant_ai_store_versions_projectId_versionNumber_key" ON "merchant_ai_store_versions"("projectId", "versionNumber");
CREATE INDEX "merchant_ai_store_versions_projectId_createdAt_idx" ON "merchant_ai_store_versions"("projectId", "createdAt");
ALTER TABLE "merchant_ai_store_projects" ADD CONSTRAINT "merchant_ai_store_projects_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_ai_store_versions" ADD CONSTRAINT "merchant_ai_store_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "merchant_ai_store_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
