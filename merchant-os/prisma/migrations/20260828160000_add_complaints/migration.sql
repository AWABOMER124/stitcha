CREATE TYPE "ComplaintStatus" AS ENUM ('NEW','UNDER_REVIEW','WAITING_MERCHANT','WAITING_CUSTOMER','ESCALATED','RESOLVED','CLOSED');
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE "ComplaintCategory" AS ENUM ('ORDER','DELIVERY','PAYMENT','PRODUCT','SERVICE','OTHER');

CREATE TABLE "complaints" (
  "id" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "orderId" TEXT,
  "category" "ComplaintCategory" NOT NULL,
  "priority" "ComplaintPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "publicTokenHash" TEXT NOT NULL,
  "resolution" TEXT,
  "assignedToId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "complaint_messages" (
  "id" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderName" TEXT,
  "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaint_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "complaints_ticketNumber_key" ON "complaints"("ticketNumber");
CREATE UNIQUE INDEX "complaints_publicTokenHash_key" ON "complaints"("publicTokenHash");
CREATE INDEX "complaints_merchantId_status_createdAt_idx" ON "complaints"("merchantId","status","createdAt");
CREATE INDEX "complaints_orderId_idx" ON "complaints"("orderId");
CREATE INDEX "complaints_status_priority_createdAt_idx" ON "complaints"("status","priority","createdAt");
CREATE INDEX "complaint_messages_complaintId_createdAt_idx" ON "complaint_messages"("complaintId","createdAt");
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
