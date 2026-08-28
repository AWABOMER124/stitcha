CREATE TABLE "complaint_attachments" (
  "id" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "complaint_attachments_storageKey_key" ON "complaint_attachments"("storageKey");
CREATE INDEX "complaint_attachments_complaintId_createdAt_idx" ON "complaint_attachments"("complaintId", "createdAt");
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
