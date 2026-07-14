-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PromoPackage" AS ENUM ('STARTER', 'STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "promo_ads" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Shop now',
    "linkUrl" TEXT,
    "package" "PromoPackage" NOT NULL DEFAULT 'STANDARD',
    "status" "PromoStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pricePaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_ads_status_endsAt_sortOrder_idx" ON "promo_ads"("status", "endsAt", "sortOrder");

-- CreateIndex
CREATE INDEX "promo_ads_sellerId_idx" ON "promo_ads"("sellerId");

-- AddForeignKey
ALTER TABLE "promo_ads" ADD CONSTRAINT "promo_ads_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_ads" ADD CONSTRAINT "promo_ads_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
