import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async getDriver(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!driver || driver.status !== 'APPROVED') {
      throw new ForbiddenException('Approved driver profile required');
    }
    return driver;
  }

  async availableJobs(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.delivery.findMany({
      where: {
        status: 'REQUESTED',
        driverId: null,
        order: {
          status: OrderStatus.AWAITING_DRIVER,
          address: driver.city
            ? { city: { equals: driver.city, mode: 'insensitive' } }
            : undefined,
        },
      },
      include: {
        order: {
          include: {
            address: true,
            items: true,
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async myJobs(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.delivery.findMany({
      where: { driverId: driver.id },
      include: {
        order: {
          include: {
            address: true,
            items: true,
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(userId: string, deliveryId: string) {
    const driver = await this.getDriver(userId);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.status !== 'REQUESTED' || delivery.driverId) {
      throw new BadRequestException('Job no longer available');
    }

    const result = await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId: driver.id,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DRIVER_ASSIGNED },
      }),
    ]);

    await this.notifications.notify(delivery.order.customerId, {
      type: 'DELIVERY',
      title: 'Driver assigned',
      body: 'A driver has accepted your delivery',
      data: { orderId: delivery.orderId, deliveryId },
    });

    return result;
  }

  async reject(userId: string, deliveryId: string, reason?: string) {
    await this.getDriver(userId);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException();
    // Driver simply declines a request they haven't accepted — no state change needed for open jobs
    return {
      message: 'Declined',
      reason: reason || 'busy',
      deliveryId,
    };
  }

  async updateStatus(
    userId: string,
    deliveryId: string,
    status: DeliveryStatus,
    location?: { lat: number; lng: number },
  ) {
    const driver = await this.getDriver(userId);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery || delivery.driverId !== driver.id) {
      throw new ForbiddenException();
    }

    const allowed: Record<string, DeliveryStatus[]> = {
      ACCEPTED: ['PICKED_UP'],
      PICKED_UP: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED'],
    };

    const next = allowed[delivery.status];
    if (!next?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${delivery.status} to ${status}`,
      );
    }

    const orderStatusMap: Partial<Record<DeliveryStatus, OrderStatus>> = {
      PICKED_UP: OrderStatus.PICKED_UP,
      IN_TRANSIT: OrderStatus.IN_TRANSIT,
      DELIVERED: OrderStatus.DELIVERED,
    };

    const data: {
      status: DeliveryStatus;
      currentLat?: number;
      currentLng?: number;
      pickedUpAt?: Date;
      deliveredAt?: Date;
    } = { status };

    if (location) {
      data.currentLat = location.lat;
      data.currentLng = location.lng;
    }
    if (status === 'PICKED_UP') data.pickedUpAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data,
      }),
      this.prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: orderStatusMap[status]! },
      }),
    ]);

    await this.notifications.notify(delivery.order.customerId, {
      type: 'DELIVERY',
      title: `Delivery ${status.toLowerCase().replace('_', ' ')}`,
      body: `Order ${delivery.order.orderNumber}: ${status}`,
      data: { orderId: delivery.orderId, status },
    });

    if (status === 'DELIVERED') {
      await this.prisma.driverProfile.update({
        where: { id: driver.id },
        data: { totalDeliveries: { increment: 1 } },
      });
    }

    return updated;
  }

  async updateLocation(
    userId: string,
    deliveryId: string,
    lat: number,
    lng: number,
  ) {
    const driver = await this.getDriver(userId);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.driverId !== driver.id) {
      throw new ForbiddenException();
    }

    await this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: { latitude: lat, longitude: lng },
    });

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { currentLat: lat, currentLng: lng },
    });
  }

  async setOnline(userId: string, isOnline: boolean) {
    const driver = await this.getDriver(userId);
    return this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: { isOnline },
    });
  }

  async earnings(userId: string) {
    const driver = await this.getDriver(userId);
    const completed = await this.prisma.delivery.findMany({
      where: { driverId: driver.id, status: 'DELIVERED' },
      select: { fee: true, deliveredAt: true },
    });
    const total = completed.reduce((s, d) => s + Number(d.fee), 0);
    return {
      totalEarnings: total,
      currency: 'TZS',
      completedJobs: completed.length,
      ratingAvg: driver.ratingAvg,
      ratingCount: driver.ratingCount,
    };
  }
}
