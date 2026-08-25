-- CreateEnum
CREATE TYPE "OutboxJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_jobs" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "OutboxJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_jobs_idempotencyKey_key" ON "outbox_jobs"("idempotencyKey");
CREATE INDEX "outbox_jobs_status_availableAt_idx" ON "outbox_jobs"("status", "availableAt");
CREATE INDEX "outbox_jobs_status_lockedAt_idx" ON "outbox_jobs"("status", "lockedAt");
CREATE INDEX "outbox_jobs_topic_status_idx" ON "outbox_jobs"("topic", "status");

-- Make in-app notification delivery idempotent across worker retries.
ALTER TABLE "notification_logs" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "notification_logs_idempotencyKey_key"
ON "notification_logs"("idempotencyKey");
