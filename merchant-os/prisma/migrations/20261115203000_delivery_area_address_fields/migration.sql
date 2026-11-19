-- Additive address metadata; retain existing names, prices and coverage geometry.
ALTER TABLE "delivery_partner_service_areas" ADD COLUMN "state" TEXT, ADD COLUMN "district" TEXT, ADD COLUMN "description" TEXT;
ALTER TABLE "delivery_zones" ADD COLUMN "city" TEXT, ADD COLUMN "district" TEXT;
