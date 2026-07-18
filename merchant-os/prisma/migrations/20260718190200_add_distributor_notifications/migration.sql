-- CreateEnum
CREATE TYPE "DistributorNotificationType" AS ENUM ('NEW_MERCHANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "distributor_notification_logs" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "type" "DistributorNotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "distributor_notification_logs_distributorId_idx" ON "distributor_notification_logs"("distributorId");

-- CreateIndex
CREATE INDEX "distributor_notification_logs_type_idx" ON "distributor_notification_logs"("type");

-- CreateIndex
CREATE INDEX "distributor_notification_logs_isRead_idx" ON "distributor_notification_logs"("isRead");

-- CreateIndex
CREATE INDEX "distributor_notification_logs_createdAt_idx" ON "distributor_notification_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "distributor_notification_logs" ADD CONSTRAINT "distributor_notification_logs_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
