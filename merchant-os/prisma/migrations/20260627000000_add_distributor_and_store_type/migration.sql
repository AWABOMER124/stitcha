-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('FOOD_MENU', 'ONLINE_STORE', 'SERVICES', 'BOOKING', 'OTHER');

-- CreateEnum
CREATE TYPE "DistributorStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DISTRIBUTOR_OWNER';
ALTER TYPE "UserRole" ADD VALUE 'DISTRIBUTOR_ADMIN';

-- CreateTable
CREATE TABLE "distributors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "status" "DistributorStatus" NOT NULL DEFAULT 'PENDING',
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_users_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "merchants"
    ADD COLUMN "storeType" "StoreType" NOT NULL DEFAULT 'ONLINE_STORE',
    ADD COLUMN "distributorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "distributors_slug_key" ON "distributors"("slug");
CREATE INDEX "distributors_slug_idx" ON "distributors"("slug");
CREATE INDEX "distributors_status_idx" ON "distributors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_users_userId_distributorId_key" ON "distributor_users"("userId", "distributorId");
CREATE INDEX "distributor_users_distributorId_idx" ON "distributor_users"("distributorId");
CREATE INDEX "distributor_users_userId_idx" ON "distributor_users"("userId");

-- CreateIndex
CREATE INDEX "merchants_distributorId_idx" ON "merchants"("distributorId");

-- AddForeignKey
ALTER TABLE "distributor_users" ADD CONSTRAINT "distributor_users_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "distributor_users" ADD CONSTRAINT "distributor_users_distributorId_fkey"
    FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_distributorId_fkey"
    FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
