CREATE TABLE "platform_return_shipments" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "originalShipmentId" TEXT NOT NULL UNIQUE REFERENCES "platform_shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "trackingCode" TEXT NOT NULL UNIQUE,
 "providerReference" TEXT,
 "status" "PlatformShipmentStatus" NOT NULL DEFAULT 'REQUESTED',
 "reason" TEXT NOT NULL,
 "pickup" JSONB NOT NULL,
 "destination" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "platform_return_events" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "returnId" TEXT NOT NULL REFERENCES "platform_return_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "eventId" TEXT NOT NULL,
 "status" "PlatformShipmentStatus" NOT NULL,
 "note" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("returnId", "eventId")
);
