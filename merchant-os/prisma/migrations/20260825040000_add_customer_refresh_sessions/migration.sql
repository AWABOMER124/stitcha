-- CreateTable
CREATE TABLE "customer_refresh_sessions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_refresh_sessions_tokenHash_key" ON "customer_refresh_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "customer_refresh_sessions_accountId_idx" ON "customer_refresh_sessions"("accountId");

-- CreateIndex
CREATE INDEX "customer_refresh_sessions_familyId_idx" ON "customer_refresh_sessions"("familyId");

-- CreateIndex
CREATE INDEX "customer_refresh_sessions_expiresAt_idx" ON "customer_refresh_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "customer_refresh_sessions" ADD CONSTRAINT "customer_refresh_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
