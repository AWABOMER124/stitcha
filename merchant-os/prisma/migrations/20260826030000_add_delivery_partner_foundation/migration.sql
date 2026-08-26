CREATE TYPE "DeliveryPartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "delivery_partners" (
    "id" TEXT NOT NULL,
    "legacyDeliveryCompanyId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "DeliveryPartnerStatus" NOT NULL DEFAULT 'PENDING',
    "supportsCod" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_partner_provider_configs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "credentials" TEXT,
    "webhookToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_partner_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_partner_service_areas" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "estimatedMinutesMin" INTEGER,
    "estimatedMinutesMax" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_partner_service_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_partner_pricing_rules" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "serviceAreaId" TEXT,
    "vehicleType" "VehicleType",
    "baseFee" DECIMAL(10,2) NOT NULL,
    "perKmFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimumFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maximumFee" DECIMAL(10,2),
    "maxDistanceKm" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SDG',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_partner_pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_couriers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "legacyDriverId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationalId" TEXT,
    "photo" TEXT,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTORCYCLE',
    "vehiclePlate" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_couriers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_partners_legacyDeliveryCompanyId_key" ON "delivery_partners"("legacyDeliveryCompanyId");
CREATE UNIQUE INDEX "delivery_partners_slug_key" ON "delivery_partners"("slug");
CREATE INDEX "delivery_partners_status_isActive_idx" ON "delivery_partners"("status", "isActive");
CREATE UNIQUE INDEX "delivery_partner_provider_configs_partnerId_key" ON "delivery_partner_provider_configs"("partnerId");
CREATE UNIQUE INDEX "delivery_partner_provider_configs_webhookToken_key" ON "delivery_partner_provider_configs"("webhookToken");
CREATE UNIQUE INDEX "delivery_partner_service_areas_partnerId_code_key" ON "delivery_partner_service_areas"("partnerId", "code");
CREATE INDEX "delivery_partner_service_areas_city_isActive_idx" ON "delivery_partner_service_areas"("city", "isActive");
CREATE INDEX "delivery_partner_pricing_rules_partnerId_isActive_priority_idx" ON "delivery_partner_pricing_rules"("partnerId", "isActive", "priority");
CREATE INDEX "delivery_partner_pricing_rules_serviceAreaId_idx" ON "delivery_partner_pricing_rules"("serviceAreaId");
CREATE UNIQUE INDEX "delivery_couriers_legacyDriverId_key" ON "delivery_couriers"("legacyDriverId");
CREATE INDEX "delivery_couriers_partnerId_status_idx" ON "delivery_couriers"("partnerId", "status");
CREATE INDEX "delivery_couriers_phone_idx" ON "delivery_couriers"("phone");

ALTER TABLE "delivery_partner_provider_configs" ADD CONSTRAINT "delivery_partner_provider_configs_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_service_areas" ADD CONSTRAINT "delivery_partner_service_areas_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_pricing_rules" ADD CONSTRAINT "delivery_partner_pricing_rules_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_pricing_rules" ADD CONSTRAINT "delivery_partner_pricing_rules_serviceAreaId_fkey"
FOREIGN KEY ("serviceAreaId") REFERENCES "delivery_partner_service_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_couriers" ADD CONSTRAINT "delivery_couriers_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_rating_check"
CHECK ("rating" >= 0 AND "rating" <= 5);
ALTER TABLE "delivery_partner_service_areas" ADD CONSTRAINT "delivery_partner_service_areas_radius_check"
CHECK ("radiusKm" IS NULL OR "radiusKm" >= 0);
ALTER TABLE "delivery_partner_service_areas" ADD CONSTRAINT "delivery_partner_service_areas_eta_check"
CHECK (
    ("estimatedMinutesMin" IS NULL OR "estimatedMinutesMin" >= 0)
    AND ("estimatedMinutesMax" IS NULL OR "estimatedMinutesMax" >= 0)
    AND ("estimatedMinutesMin" IS NULL OR "estimatedMinutesMax" IS NULL OR "estimatedMinutesMin" <= "estimatedMinutesMax")
);
ALTER TABLE "delivery_partner_pricing_rules" ADD CONSTRAINT "delivery_partner_pricing_rules_amounts_check"
CHECK (
    "baseFee" >= 0 AND "perKmFee" >= 0 AND "minimumFee" >= 0
    AND ("maximumFee" IS NULL OR "maximumFee" >= "minimumFee")
    AND ("maxDistanceKm" IS NULL OR "maxDistanceKm" >= 0)
);
ALTER TABLE "delivery_couriers" ADD CONSTRAINT "delivery_couriers_rating_check"
CHECK ("rating" >= 0 AND "rating" <= 5);

-- Create platform-owned shadow records without changing the live order flow.
INSERT INTO "delivery_partners" (
    "id", "legacyDeliveryCompanyId", "name", "slug", "contactName", "phone",
    "status", "isActive", "createdAt", "updatedAt"
)
SELECT
    'dpartner_' || md5(dc."id"), dc."id", dc."name",
    'legacy-' || substr(md5(dc."id"), 1, 24), dc."contactName", dc."phone",
    CASE WHEN dc."isActive" THEN 'PENDING'::"DeliveryPartnerStatus" ELSE 'SUSPENDED'::"DeliveryPartnerStatus" END,
    dc."isActive", dc."createdAt", dc."updatedAt"
FROM "delivery_companies" dc
ON CONFLICT ("legacyDeliveryCompanyId") DO NOTHING;

INSERT INTO "delivery_partner_provider_configs" (
    "id", "partnerId", "providerKey", "apiBaseUrl", "credentials", "webhookToken",
    "isActive", "createdAt", "updatedAt"
)
SELECT
    'dppconfig_' || md5(c."id"), p."id", c."providerKey", c."apiBaseUrl",
    c."credentials", c."webhookToken", c."isActive", c."createdAt", c."updatedAt"
FROM "delivery_provider_configs" c
JOIN "delivery_partners" p ON p."legacyDeliveryCompanyId" = c."deliveryCompanyId"
ON CONFLICT ("partnerId") DO NOTHING;

-- Only company-linked drivers are safe to classify automatically. Distributor
-- fleet drivers remain in the legacy model until a human assigns ownership.
INSERT INTO "delivery_couriers" (
    "id", "partnerId", "legacyDriverId", "name", "phone", "nationalId", "photo",
    "vehicleType", "vehiclePlate", "status", "isActive", "isVerified", "rating",
    "currentLat", "currentLng", "lastSeenAt", "createdAt", "updatedAt"
)
SELECT
    'dcourier_' || md5(d."id"), p."id", d."id", d."name", d."phone",
    d."nationalId", d."photo", d."vehicleType", d."vehiclePlate", d."status",
    d."isActive", d."isVerified", d."rating", d."currentLat", d."currentLng",
    d."lastSeenAt", d."createdAt", d."updatedAt"
FROM "drivers" d
JOIN "delivery_partners" p ON p."legacyDeliveryCompanyId" = d."deliveryCompanyId"
WHERE d."deliveryCompanyId" IS NOT NULL
ON CONFLICT ("legacyDriverId") DO NOTHING;
