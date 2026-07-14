-- Track when driver live position was last written (customer live map)
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3);
