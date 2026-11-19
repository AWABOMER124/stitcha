ALTER TABLE "delivery_partner_service_areas"
  ADD COLUMN "allCities" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allDistricts" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "deliveries" ADD COLUMN "state" TEXT;

-- Existing unknown areas remain specific; NULL never means national coverage.
ALTER TABLE "delivery_partner_service_areas" ADD CONSTRAINT "delivery_area_explicit_scope"
  CHECK ((NOT "allCities" OR ("allDistricts" AND "city" IS NULL))
    AND (NOT "allDistricts" OR "district" IS NULL)
    AND (NOT ("allCities" OR "allDistricts") OR ("state" IS NOT NULL AND length(trim("state")) >= 2))
    AND (NOT ("allDistricts" AND NOT "allCities") OR ("city" IS NOT NULL AND length(trim("city")) >= 2)));
