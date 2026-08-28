ALTER TABLE "conversations" ADD COLUMN "publicTokenHash" TEXT;
ALTER TABLE "inbox_messages" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "conversations_publicTokenHash_key" ON "conversations"("publicTokenHash");
CREATE INDEX "inbox_messages_conversationId_readAt_idx" ON "inbox_messages"("conversationId", "readAt");
