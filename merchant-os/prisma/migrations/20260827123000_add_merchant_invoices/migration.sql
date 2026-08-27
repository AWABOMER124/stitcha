CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'SDG',
  "subtotal" DECIMAL(10,2) NOT NULL,
  "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "billingAddress" TEXT,
  "notes" TEXT,
  "issuedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "description" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");
CREATE UNIQUE INDEX "invoices_publicToken_key" ON "invoices"("publicToken");
CREATE UNIQUE INDEX "invoices_merchantId_invoiceNumber_key" ON "invoices"("merchantId", "invoiceNumber");
CREATE INDEX "invoices_merchantId_status_idx" ON "invoices"("merchantId", "status");
CREATE INDEX "invoices_merchantId_createdAt_idx" ON "invoices"("merchantId", "createdAt");
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "name", "module", "action", "description") VALUES
  ('perm_invoices_create', 'invoices:create', 'invoices', 'create', 'Create invoices from merchant orders'),
  ('perm_invoices_read', 'invoices:read', 'invoices', 'read', 'View and print merchant invoices'),
  ('perm_invoices_update', 'invoices:update', 'invoices', 'update', 'Issue, mark paid, or void invoices'),
  ('perm_exports_download', 'exports:download', 'exports', 'download', 'Download merchant data exports')
ON CONFLICT ("name") DO NOTHING;
