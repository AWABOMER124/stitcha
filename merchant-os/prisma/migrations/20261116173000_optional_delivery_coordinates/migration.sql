-- Unknown route distance is NULL, never an invented zero-kilometre trip.
ALTER TABLE "delivery_quotes" ALTER COLUMN "distanceKm" DROP NOT NULL;
