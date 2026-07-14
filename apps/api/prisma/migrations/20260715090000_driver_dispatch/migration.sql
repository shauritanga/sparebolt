-- Professional marketplace dispatch: shop-centric rings + offer tracking

ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "pickupCity" TEXT;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "pickupLabel" TEXT;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "dispatchRing" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "dispatchNextAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "deliveries_status_dispatchNextAt_idx" ON "deliveries"("status", "dispatchNextAt");

ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "dispatch_offers" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "ring" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOTIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispatch_offers_deliveryId_driverId_key" ON "dispatch_offers"("deliveryId", "driverId");
CREATE INDEX IF NOT EXISTS "dispatch_offers_deliveryId_status_idx" ON "dispatch_offers"("deliveryId", "status");
CREATE INDEX IF NOT EXISTS "dispatch_offers_driverId_idx" ON "dispatch_offers"("driverId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_offers_deliveryId_fkey'
  ) THEN
    ALTER TABLE "dispatch_offers"
      ADD CONSTRAINT "dispatch_offers_deliveryId_fkey"
      FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_offers_driverId_fkey'
  ) THEN
    ALTER TABLE "dispatch_offers"
      ADD CONSTRAINT "dispatch_offers_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
