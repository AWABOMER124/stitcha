/*
  Warnings:

  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store_drafts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "store_drafts" DROP CONSTRAINT "store_drafts_apiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "store_drafts" DROP CONSTRAINT "store_drafts_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "store_drafts" DROP CONSTRAINT "store_drafts_merchantId_fkey";

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "store_drafts";

-- DropEnum
DROP TYPE "StoreDraftStatus";
