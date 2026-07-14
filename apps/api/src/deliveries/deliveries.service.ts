import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchService, haversineKm } from './dispatch.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private dispatch: DispatchService,
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

  /**
   * Open jobs visible to this driver: approved, online, near shop (or city),
   * not declined, first-accept-wins still unassigned.
   */
  async availableJobs(userId: string) {
    const driver = await this.getDriver(userId);
    if (!driver.isOnline) {
      return [];
    }

    const open = await this.prisma.delivery.findMany({
      where: {
        status: 'REQUESTED',
        driverId: null,
        order: { status: OrderStatus.AWAITING_DRIVER },
        NOT: {
          dispatchOffers: {
            some: {
              driverId: driver.id,
              status: 'DECLINED',
            },
          },
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
      take: 50,
    });

    const withMeta: Array<
      (typeof open)[number] & {
        distanceKm: number | null;
        matchReason: string;
      }
    > = [];

    for (const job of open) {
      const { ok, distanceKm } = await this.dispatch.driverCanSeeJob(
        driver,
        job,
      );
      if (!ok) continue;

      let matchReason = 'city';
      if (
        distanceKm != null &&
        job.pickupLat != null &&
        job.pickupLng != null
      ) {
        matchReason = 'distance';
      }

      withMeta.push({ ...job, distanceKm, matchReason });
    }

    withMeta.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return withMeta;
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
    if (!driver.isOnline) {
      throw new BadRequestException('Go online to accept jobs');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.status !== 'REQUESTED' || delivery.driverId) {
      throw new BadRequestException('Job no longer available');
    }

    // Must still be in dispatch range (or previously offered)
    const canSee = await this.dispatch.driverCanSeeJob(driver, {
      id: delivery.id,
      pickupLat: delivery.pickupLat,
      pickupLng: delivery.pickupLng,
      pickupCity: delivery.pickupCity,
      dispatchRing: delivery.dispatchRing,
    });
    const wasOffered = await this.prisma.dispatchOffer.findFirst({
      where: {
        deliveryId,
        driverId: driver.id,
        status: 'NOTIFIED',
      },
    });
    if (!canSee.ok && !wasOffered) {
      throw new BadRequestException('Job is outside your dispatch area');
    }

    // One active job at a time
    const active = await this.prisma.delivery.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
    });
    if (active) {
      throw new BadRequestException('Finish your current job before accepting another');
    }

    // Atomic claim — first accept wins under concurrent drivers
    // Seed live track with driver's current position when available
    const now = new Date();
    const seedLoc =
      driver.latitude != null && driver.longitude != null
        ? {
            currentLat: driver.latitude,
            currentLng: driver.longitude,
            locationUpdatedAt: now,
          }
        : {};

    const claimed = await this.prisma.$transaction(async (tx) => {
      const res = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          status: 'REQUESTED',
          driverId: null,
        },
        data: {
          driverId: driver.id,
          status: 'ACCEPTED',
          acceptedAt: now,
          dispatchNextAt: null,
          ...seedLoc,
        },
      });
      if (res.count === 0) {
        throw new BadRequestException('Job no longer available');
      }
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DRIVER_ASSIGNED },
      });
      return tx.delivery.findUnique({ where: { id: deliveryId } });
    });

    await this.notifications.notify(delivery.order.customerId, {
      type: 'DELIVERY',
      title: 'Driver assigned',
      body: 'A driver has accepted your delivery — you can track them live',
      data: {
        orderId: delivery.orderId,
        deliveryId,
        link: `/orders/${delivery.orderId}`,
      },
    });

    return claimed;
  }

  async reject(userId: string, deliveryId: string, reason?: string) {
    const driver = await this.getDriver(userId);
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.driverId && delivery.driverId !== driver.id) {
      throw new BadRequestException('Job already taken');
    }
    // Decline open offer — will not be re-offered
    return this.dispatch.recordDecline(deliveryId, driver.id, reason);
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
      locationUpdatedAt?: Date;
      pickedUpAt?: Date;
      deliveredAt?: Date;
    } = { status };

    if (location) {
      data.currentLat = location.lat;
      data.currentLng = location.lng;
      data.locationUpdatedAt = new Date();
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

    if (location) {
      await this.prisma.driverProfile.update({
        where: { id: driver.id },
        data: {
          latitude: location.lat,
          longitude: location.lng,
          locationUpdatedAt: new Date(),
        },
      });
    }

    await this.notifications.notify(delivery.order.customerId, {
      type: 'DELIVERY',
      title: `Delivery ${status.toLowerCase().replace('_', ' ')}`,
      body: `Order ${delivery.order.orderNumber}: ${status}`,
      data: {
        orderId: delivery.orderId,
        status,
        link: `/orders/${delivery.orderId}`,
      },
    });

    if (status === 'DELIVERED') {
      await this.prisma.driverProfile.update({
        where: { id: driver.id },
        data: { totalDeliveries: { increment: 1 } },
      });
    }

    return updated;
  }

  /**
   * Live track: write position onto an active delivery for the customer map.
   * Only while status is ACCEPTED | PICKED_UP | IN_TRANSIT.
   */
  async updateLocation(
    userId: string,
    deliveryId: string,
    lat: number,
    lng: number,
  ) {
    const driver = await this.getDriver(userId);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.driverId !== driver.id) {
      throw new ForbiddenException();
    }
    if (!['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)) {
      throw new BadRequestException('Tracking only available on active jobs');
    }

    const now = new Date();
    await this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: {
        latitude: lat,
        longitude: lng,
        locationUpdatedAt: now,
      },
    });

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        currentLat: lat,
        currentLng: lng,
        locationUpdatedAt: now,
      },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
        status: true,
      },
    });
  }

  /**
   * Heartbeat while online (dispatch). If driver has an active job, also
   * mirrors coordinates onto that delivery for customer live tracking.
   */
  async updateDriverLocation(userId: string, lat: number, lng: number) {
    const driver = await this.getDriver(userId);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new BadRequestException('Invalid coordinates');
    }
    const now = new Date();
    const profile = await this.prisma.driverProfile.update({
      where: { id: driver.id },
      data: {
        latitude: lat,
        longitude: lng,
        locationUpdatedAt: now,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationUpdatedAt: true,
        isOnline: true,
      },
    });

    // Mirror onto active delivery so customers can track without a second API call
    const active = await this.prisma.delivery.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      select: { id: true },
    });
    if (active) {
      await this.prisma.delivery.update({
        where: { id: active.id },
        data: {
          currentLat: lat,
          currentLng: lng,
          locationUpdatedAt: now,
        },
      });
    }

    return {
      ...profile,
      activeDeliveryId: active?.id ?? null,
    };
  }

  async setOnline(
    userId: string,
    isOnline: boolean,
    location?: { lat: number; lng: number },
  ) {
    const driver = await this.getDriver(userId);
    const data: {
      isOnline: boolean;
      latitude?: number;
      longitude?: number;
      locationUpdatedAt?: Date;
    } = { isOnline };

    if (
      location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
    ) {
      data.latitude = location.lat;
      data.longitude = location.lng;
      data.locationUpdatedAt = new Date();
    }

    return this.prisma.driverProfile.update({
      where: { id: driver.id },
      data,
      select: {
        id: true,
        isOnline: true,
        latitude: true,
        longitude: true,
        locationUpdatedAt: true,
        city: true,
      },
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

  /** Distance helper for tests / callers */
  distanceKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) {
    return haversineKm(a.lat, a.lng, b.lat, b.lng);
  }
}
