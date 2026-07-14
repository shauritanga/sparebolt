import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromoPackage, PromoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto } from './dto/create-promo.dto';

const PACKAGE_DAYS: Record<PromoPackage, number> = {
  STARTER: 3,
  STANDARD: 7,
  PREMIUM: 14,
};

/** Display pricing (TZS) — mock billing for MVP */
const PACKAGE_PRICE: Record<PromoPackage, number> = {
  STARTER: 15000,
  STANDARD: 35000,
  PREMIUM: 75000,
};

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  /** Active home carousel ads (max 3, ordered by package priority + sort) */
  async activeCarousel(limit = 3) {
    const now = new Date();
    const ads = await this.prisma.promoAd.findMany({
      where: {
        status: PromoStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        seller: {
          select: { id: true, businessName: true, city: true },
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
          },
        },
      },
      orderBy: [
        { package: 'desc' }, // PREMIUM first alphabetically... actually PREMIUM > STANDARD > STARTER
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(limit, 10),
    });

    // Prefer PREMIUM package in carousel order
    const ranked = [...ads].sort((a, b) => {
      const rank = (p: PromoPackage) =>
        p === 'PREMIUM' ? 0 : p === 'STANDARD' ? 1 : 2;
      return rank(a.package) - rank(b.package) || a.sortOrder - b.sortOrder;
    });

    return ranked.slice(0, limit);
  }

  async trackImpression(id: string) {
    await this.prisma.promoAd.updateMany({
      where: { id, status: PromoStatus.ACTIVE },
      data: { impressions: { increment: 1 } },
    });
    return { ok: true };
  }

  async trackClick(id: string) {
    await this.prisma.promoAd.updateMany({
      where: { id, status: PromoStatus.ACTIVE },
      data: { clicks: { increment: 1 } },
    });
    return { ok: true };
  }

  async packages() {
    return (Object.keys(PACKAGE_DAYS) as PromoPackage[]).map((pkg) => ({
      package: pkg,
      days: PACKAGE_DAYS[pkg],
      price: PACKAGE_PRICE[pkg],
      currency: 'TZS',
      description:
        pkg === 'PREMIUM'
          ? 'Homepage carousel priority for 14 days'
          : pkg === 'STANDARD'
            ? 'Homepage carousel for 7 days'
            : 'Homepage carousel for 3 days',
    }));
  }

  async myPromos(userId: string) {
    const seller = await this.getSeller(userId);
    return this.prisma.promoAd.findMany({
      where: { sellerId: seller.id },
      include: {
        listing: {
          select: { id: true, title: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async subscribe(userId: string, dto: CreatePromoDto) {
    const seller = await this.getSeller(userId);
    if (seller.status !== 'APPROVED') {
      throw new ForbiddenException('Approved seller required');
    }

    let imageUrl = dto.imageUrl;
    let title = dto.title;
    let listingId = dto.listingId;

    if (listingId) {
      const listing = await this.prisma.listing.findFirst({
        where: { id: listingId, sellerId: seller.id, isActive: true },
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (!title) title = listing.title;
      if (!imageUrl) {
        imageUrl = listing.images[0]?.url;
      }
    }

    if (!title?.trim()) throw new BadRequestException('Title is required');
    if (!imageUrl?.trim()) {
      throw new BadRequestException('Image URL or listing with image required');
    }

    const pkg = dto.package ?? PromoPackage.STANDARD;
    const days = PACKAGE_DAYS[pkg];
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

    // MVP: auto-activate after “payment” (mock)
    return this.prisma.promoAd.create({
      data: {
        sellerId: seller.id,
        listingId: listingId || null,
        title: title.trim(),
        subtitle: dto.subtitle,
        imageUrl,
        ctaLabel: dto.ctaLabel || 'Shop now',
        linkUrl: dto.linkUrl,
        package: pkg,
        status: PromoStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 0,
        startsAt,
        endsAt,
        pricePaid: PACKAGE_PRICE[pkg],
      },
      include: {
        listing: { select: { id: true, title: true } },
      },
    });
  }

  async pause(userId: string, id: string) {
    const seller = await this.getSeller(userId);
    const ad = await this.prisma.promoAd.findUnique({ where: { id } });
    if (!ad || ad.sellerId !== seller.id) throw new NotFoundException();
    return this.prisma.promoAd.update({
      where: { id },
      data: { status: PromoStatus.PAUSED },
    });
  }

  private async getSeller(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) throw new ForbiddenException('Seller profile required');
    return seller;
  }
}
