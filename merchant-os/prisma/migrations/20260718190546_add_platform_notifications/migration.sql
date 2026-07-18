-- CreateEnum
CREATE TYPE "PlatformNotificationType" AS ENUM ('NEW_DISTRIBUTOR', 'SYSTEM');

-- CreateTable
CREATE TABLE "platform_notification_logs" (
    "id" TEXT NOT NULL,
    "type" "PlatformNotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_notification_logs_type_idx" ON "platform_notification_logs"("type");

-- CreateIndex
CREATE INDEX "platform_notification_logs_isRead_idx" ON "platform_notification_logs"("isRead");

-- CreateIndex
CREATE INDEX "platform_notification_logs_createdAt_idx" ON "platform_notification_logs"("createdAt");
