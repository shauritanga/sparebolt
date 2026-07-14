import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  private async getSeller(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!seller) throw new ForbiddenException('Seller profile required');
    return seller;
  }

  async analytics(userId: string) {
    const seller = await this.getSeller(userId);

    const items = await this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
      include: {
        order: {
          select: {
            status: true,
            createdAt: true,
            escrow: true,
          },
        },
      },
    });

    const totalRevenue = items
      .filter((i) =>
        ['CONFIRMED', 'DELIVERED', 'PAID_ESCROW', 'IN_TRANSIT', 'PICKED_UP'].includes(
          i.order.status,
        ),
      )
      .reduce((s, i) => s + Number(i.lineTotal), 0);

    const activeListings = await this.prisma.listing.count({
      where: { sellerId: seller.id, isActive: true },
    });

    const lowStock = await this.prisma.listing.findMany({
      where: {
        sellerId: seller.id,
        isActive: true,
        quantity: { lte: 2 },
      },
      take: 10,
    });

    return {
      businessName: seller.businessName,
      ratingAvg: seller.ratingAvg,
      ratingCount: seller.ratingCount,
      totalSales: seller.totalSales,
      totalRevenue,
      activeListings,
      orderItemCount: items.length,
      lowStock,
    };
  }

  async sales(userId: string) {
    const seller = await this.getSeller(userId);
    return this.prisma.orderItem.findMany({
      where: { sellerId: seller.id },
      include: {
        order: {
          include: {
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
            payment: true,
            escrow: true,
            delivery: true,
          },
        },
        listing: { include: { images: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: 50,
    });
  }
}
