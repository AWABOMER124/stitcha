CREATE TABLE "sales_settings" (
  "merchantId" TEXT PRIMARY KEY REFERENCES "merchants"("id") ON DELETE CASCADE,
  "config" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "sales_quotes" (
  "id" TEXT PRIMARY KEY,
  "merchantId" TEXT NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "token" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','PENDING_APPROVAL','CANCELLED','CONVERTED')),
  "version" INTEGER NOT NULL DEFAULT 1,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL CHECK ("subtotal" >= 0),
  "deliveryFee" DECIMAL(10,2) NOT NULL CHECK ("deliveryFee" >= 0),
  "total" DECIMAL(10,2) NOT NULL CHECK ("total" > 0),
  "discountPercent" DECIMAL(5,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
  "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'MERCHANT_DELIVERY',
  "notes" TEXT,
  "terms" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "orderId" TEXT UNIQUE REFERENCES "orders"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "sales_quotes_merchantId_createdById_createdAt_idx" ON "sales_quotes"("merchantId","createdById","createdAt");
CREATE INDEX "sales_quotes_merchantId_status_expiresAt_idx" ON "sales_quotes"("merchantId","status","expiresAt");
CREATE TABLE "sales_quote_events" (
  "id" TEXT PRIMARY KEY,
  "quoteId" TEXT NOT NULL REFERENCES "sales_quotes"("id") ON DELETE CASCADE,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "sales_quote_events_quoteId_createdAt_idx" ON "sales_quote_events"("quoteId","createdAt");
UPDATE "merchant_plans" SET "entitlements" = "entitlements"::jsonb ||
  jsonb_build_object('assistedSales', "code" IN ('BUSINESS','SA_BUSINESS')),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Protect the accepted total across shipping jobs, old APIs and future writers.
CREATE FUNCTION lock_assisted_sale_amount() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."subtotal", NEW."deliveryFee", NEW."discount", NEW."tax", NEW."total")
     IS DISTINCT FROM ROW(OLD."subtotal", OLD."deliveryFee", OLD."discount", OLD."tax", OLD."total")
     AND EXISTS (SELECT 1 FROM "sales_quotes" WHERE "orderId" = OLD."id") THEN
    RAISE EXCEPTION 'ASSISTED_SALE_AMOUNT_LOCKED: negotiated order total cannot change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assisted_sale_amount_lock BEFORE UPDATE OF "subtotal", "deliveryFee", "discount", "tax", "total"
ON "orders" FOR EACH ROW EXECUTE FUNCTION lock_assisted_sale_amount();
