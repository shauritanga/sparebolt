import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateAddressDto,
  CreateOrderDto,
  CreateReviewDto,
  OpenDisputeDto,
} from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  private generateOrderNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SB-${ts}-${rand}`;
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: { ...dto, userId },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    const listingIds = dto.items.map((i) => i.listingId);
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: listingIds }, isActive: true },
      include: { seller: true },
    });

    if (listings.length !== listingIds.length) {
      throw new BadRequestException('One or more listings unavailable');
    }

    const feePct = Number(this.config.get('PLATFORM_FEE_PERCENT', 5));
    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of dto.items) {
      const listing = listings.find((l) => l.id === item.listingId)!;
      if (listing.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${listing.title}`);
      }
      const unitPrice = Number(listing.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      orderItems.push({
        listing: { connect: { id: listing.id } },
        sellerId: listing.sellerId,
        title: listing.title,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const deliveryFee = 5000; // TZS flat for MVP; can compute by distance later
    const platformFee = Math.round((subtotal * feePct) / 100);
    const total = subtotal + deliveryFee;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const updated = await tx.listing.updateMany({
          where: {
            id: item.listingId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('Stock changed during checkout');
        }
      }

      return tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          customerId: userId,
          addressId: address.id,
          status: OrderStatus.PENDING_PAYMENT,
          subtotal,
          deliveryFee,
          platformFee,
          total,
          notes: dto.notes,
          preferredDriver: dto.preferredDriver ?? false,
          items: { create: orderItems },
          payment: {
            create: {
              amount: total,
              currency: 'TZS',
              status: 'PENDING',
              method: 'mobile_money',
              phone: dto.paymentPhone,
            },
          },
        },
        include: {
          items: true,
          payment: true,
          address: true,
        },
      });
    });

    // Initiate ClickPesa (or mock) payment
    const paymentResult = await this.payments.initiatePayment({
      orderId: order.id,
      amount: Number(order.total),
      phone: dto.paymentPhone,
      orderNumber: order.orderNumber,
    });

    return { order, payment: paymentResult };
  }

  async myOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        items: true,
        payment: true,
        escrow: true,
        delivery: { include: { driver: true } },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(userId: string, orderId: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { listing: { include: { images: true } } } },
        payment: true,
        escrow: true,
        delivery: { include: { driver: { include: { user: true } } } },
        address: true,
        reviews: true,
        dispute: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      role !== 'ADMIN' &&
      order.customerId !== userId &&
      !order.items.some((i) => false) // sellers checked separately
    ) {
      // Allow customer, admin, assigned driver
      const isDriver =
        order.delivery?.driver?.userId === userId;
      if (order.customerId !== userId && !isDriver && role !== 'ADMIN') {
        // check if seller of any item
        const seller = await this.prisma.sellerProfile.findUnique({
          where: { userId },
        });
        const isSeller =
          seller && order.items.some((i) => i.sellerId === seller.id);
        if (!isSeller) throw new ForbiddenException();
      }
    }

    return this.withLiveTracking(order);
  }

  /**
   * Customer-safe live tracking: share driver position only while the job is
   * active; stop after delivered (privacy).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private withLiveTracking(order: any) {
    const d = order.delivery as
      | {
          id: string;
          status: string;
          driverId: string | null;
          currentLat: number | null;
          currentLng: number | null;
          locationUpdatedAt: Date | null;
          pickupLat: number | null;
          pickupLng: number | null;
          pickupLabel: string | null;
          pickupCity: string | null;
          dropoffLat: number | null;
          dropoffLng: number | null;
          fee: unknown;
          acceptedAt: Date | null;
          pickedUpAt: Date | null;
          deliveredAt: Date | null;
          driver: {
            vehicleType: string;
            vehiclePlate: string;
            ratingAvg: number;
            user?: {
              firstName: string;
              lastName: string;
              phone: string | null;
            } | null;
          } | null;
        }
      | null;

    const activeStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
    const live =
      !!d &&
      activeStatuses.includes(d.status) &&
      ['DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status);

    const dropLat =
      d?.dropoffLat ?? order.address?.latitude ?? null;
    const dropLng =
      d?.dropoffLng ?? order.address?.longitude ?? null;

    let phase: 'to_shop' | 'to_customer' | 'idle' | 'done' = 'idle';
    if (!d || d.status === 'REQUESTED') phase = 'idle';
    else if (d.status === 'ACCEPTED') phase = 'to_shop';
    else if (d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT')
      phase = 'to_customer';
    else phase = 'done';

    const currentLat = live ? d!.currentLat : null;
    const currentLng = live ? d!.currentLng : null;

    const publicDriver = d?.driver
      ? {
          name: d.driver.user
            ? `${d.driver.user.firstName} ${d.driver.user.lastName}`.trim()
            : 'Driver',
          phone: d.driver.user?.phone ?? null,
          vehicleType: d.driver.vehicleType,
          vehiclePlate: d.driver.vehiclePlate,
          ratingAvg: d.driver.ratingAvg,
        }
      : null;

    const tracking = d
      ? {
          enabled: live,
          phase,
          currentLat,
          currentLng,
          locationUpdatedAt: live ? d.locationUpdatedAt : null,
          pickupLat: d.pickupLat,
          pickupLng: d.pickupLng,
          pickupLabel: d.pickupLabel,
          pickupCity: d.pickupCity,
          dropoffLat: dropLat,
          dropoffLng: dropLng,
          dropoffLabel: order.address
            ? `${order.address.street}, ${order.address.city}`
            : null,
          driver: publicDriver,
        }
      : null;

    const delivery = d
      ? {
          id: d.id,
          status: d.status,
          driverId: d.driverId,
          currentLat,
          currentLng,
          locationUpdatedAt: live ? d.locationUpdatedAt : null,
          pickupLat: d.pickupLat,
          pickupLng: d.pickupLng,
          pickupLabel: d.pickupLabel,
          pickupCity: d.pickupCity,
          dropoffLat: dropLat,
          dropoffLng: dropLng,
          fee: d.fee,
          acceptedAt: d.acceptedAt,
          pickedUpAt: d.pickedUpAt,
          deliveredAt: d.deliveredAt,
          driver: publicDriver,
        }
      : null;

    return {
      ...order,
      delivery,
      tracking,
    };
  }

  async confirmReceipt(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true, items: true },
    });
    if (!order || order.customerId !== userId) {
      throw new ForbiddenException();
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be delivered first');
    }
    if (!order.escrow || order.escrow.status !== 'HELD') {
      throw new BadRequestException('No funds held in escrow');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
      }),
      this.prisma.escrow.update({
        where: { orderId },
        data: {
          status: 'RELEASED_TO_SELLER',
          releasedAt: new Date(),
        },
      }),
    ]);

    await this.notifications.notify(userId, {
      type: 'PAYMENT',
      title: 'Payment released',
      body: `Escrow released for order ${order.orderNumber}`,
      data: { orderId },
    });

    // Notify sellers
    const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
    for (const sellerId of sellerIds) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: sellerId },
      });
      if (seller) {
        await this.notifications.notify(seller.userId, {
          type: 'PAYMENT',
          title: 'Funds released',
          body: `Payment for order ${order.orderNumber} has been released to you`,
          data: { orderId },
        });
        await this.prisma.sellerProfile.update({
          where: { id: sellerId },
          data: { totalSales: { increment: 1 } },
        });
      }
    }

    return this.getOrder(userId, orderId);
  }

  async openDispute(userId: string, orderId: string, dto: OpenDisputeDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== userId) throw new ForbiddenException();
    const disputable: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PAID_ESCROW,
      OrderStatus.IN_TRANSIT,
    ];
    if (!disputable.includes(order.status)) {
      throw new BadRequestException('Cannot dispute this order');
    }

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({
        data: {
          orderId,
          openedById: userId,
          reason: dto.reason,
          description: dto.description,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DISPUTED },
      }),
    ]);

    return dispute;
  }

  async addReview(userId: string, orderId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });
    if (!order || order.customerId !== userId) throw new ForbiddenException();
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Can only review completed deliveries');
    }
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }

    const review = await this.prisma.review.create({
      data: {
        orderId,
        authorId: userId,
        rating: dto.rating,
        comment: dto.comment,
        sellerId: dto.sellerId,
        driverId: dto.driverId ?? order.delivery?.driverId,
      },
    });

    if (dto.sellerId) {
      await this.recalcSellerRating(dto.sellerId);
    }
    if (review.driverId) {
      await this.recalcDriverRating(review.driverId);
    }

    return review;
  }

  private async recalcSellerRating(sellerId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
    });
  }

  private async recalcDriverRating(driverId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { driverId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
    });
  }

  /**
   * Alternate path to complete payment + start driver dispatch.
   * Prefer PaymentsService.completePayment for webhooks.
   */
  async markPaidAndHoldEscrow(orderId: string, providerRef?: string) {
    return this.payments.completePayment(orderId, providerRef);
  }
}
