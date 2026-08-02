-- CreateEnum
CREATE TYPE "StoreDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_drafts" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "prompt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slogan" TEXT,
    "primaryColor" TEXT,
    "welcomeText" TEXT,
    "categories" JSONB NOT NULL DEFAULT '[]',
    "status" "StoreDraftStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "merchantId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_distributorId_idx" ON "api_keys"("distributorId");

-- CreateIndex
CREATE INDEX "store_drafts_distributorId_status_idx" ON "store_drafts"("distributorId", "status");

-- CreateIndex
CREATE INDEX "store_drafts_apiKeyId_idx" ON "store_drafts"("apiKeyId");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_drafts" ADD CONSTRAINT "store_drafts_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_drafts" ADD CONSTRAINT "store_drafts_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_drafts" ADD CONSTRAINT "store_drafts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
