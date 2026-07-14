import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Expanding rings around shop pickup (km). */
const RING_RADIUS_KM = [5, 10, 25] as const;
const MAX_RING = RING_RADIUS_KM.length;
/** Seconds before expanding to the next ring if still unclaimed. */
const RING_EXPAND_SECONDS = 45;
/** Ignore GPS older than this when matching by distance. */
const LOCATION_STALE_MS = 15 * 60 * 1000;

export type PickupPoint = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  label: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
};

type EligibleDriver = {
  id: string;
  userId: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  distanceKm: number | null;
};

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Resolve shop (pickup) location from order sellers / listings.
   * Dispatch is always relative to pickup, not the customer alone.
   */
  async resolvePickup(orderId: string): Promise<PickupPoint> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        items: {
          include: {
            listing: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        lat: null,
        lng: null,
        city: null,
        label: null,
        dropoffLat: null,
        dropoffLng: null,
      };
    }

    const dropoffLat = order.address?.latitude ?? null;
    const dropoffLng = order.address?.longitude ?? null;

    // Prefer first item's seller shop, then listing coords, then other items
    for (const item of order.items) {
      const seller = item.listing?.seller;
      const listing = item.listing;
      if (seller?.latitude != null && seller?.longitude != null) {
        return {
          lat: seller.latitude,
          lng: seller.longitude,
          city: seller.city || listing?.city || order.address?.city || null,
          label: seller.businessName || listing?.title || null,
          dropoffLat,
          dropoffLng,
        };
      }
      if (listing?.latitude != null && listing?.longitude != null) {
        return {
          lat: listing.latitude,
          lng: listing.longitude,
          city: listing.city || seller?.city || order.address?.city || null,
          label: seller?.businessName || listing.title || null,
          dropoffLat,
          dropoffLng,
        };
      }
    }

    // City-only fallback from seller / listing / customer
    const seller = order.items[0]?.listing?.seller;
    const listing = order.items[0]?.listing;
    return {
      lat: null,
      lng: null,
      city:
        seller?.city ||
        listing?.city ||
        order.address?.city ||
        null,
      label: seller?.businessName || listing?.title || null,
      dropoffLat,
      dropoffLng,
    };
  }

  /**
   * Start marketplace dispatch after a delivery is created (ring 1 push).
   */
  async startDispatch(deliveryId: string): Promise<void> {
    try {
      await this.broadcastRing(deliveryId, 1);
    } catch (err) {
      this.logger.error(
        `startDispatch failed for ${deliveryId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Expand open jobs that are past dispatchNextAt.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async expandOpenDispatches() {
    const due = await this.prisma.delivery.findMany({
      where: {
        status: 'REQUESTED',
        driverId: null,
        dispatchNextAt: { lte: new Date() },
        dispatchRing: { lt: MAX_RING },
        order: { status: OrderStatus.AWAITING_DRIVER },
      },
      select: { id: true, dispatchRing: true },
      take: 50,
    });

    for (const d of due) {
      const nextRing = d.dispatchRing + 1;
      if (nextRing > MAX_RING) continue;
      try {
        await this.broadcastRing(d.id, nextRing);
      } catch (err) {
        this.logger.error(
          `expand ring ${nextRing} for ${d.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  /**
   * Broadcast job to eligible drivers in the given ring.
   */
  async broadcastRing(deliveryId: string, ring: number): Promise<number> {
    if (ring < 1 || ring > MAX_RING) return 0;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            address: true,
            items: true,
          },
        },
      },
    });

    if (
      !delivery ||
      delivery.status !== 'REQUESTED' ||
      delivery.driverId ||
      delivery.order.status !== OrderStatus.AWAITING_DRIVER
    ) {
      return 0;
    }

    // Ensure pickup fields are populated
    let pickupLat = delivery.pickupLat;
    let pickupLng = delivery.pickupLng;
    let pickupCity = delivery.pickupCity;
    let pickupLabel = delivery.pickupLabel;

    if (pickupLat == null || pickupLng == null || !pickupCity) {
      const resolved = await this.resolvePickup(delivery.orderId);
      pickupLat = pickupLat ?? resolved.lat;
      pickupLng = pickupLng ?? resolved.lng;
      pickupCity = pickupCity ?? resolved.city;
      pickupLabel = pickupLabel ?? resolved.label;

      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          pickupLat: pickupLat ?? undefined,
          pickupLng: pickupLng ?? undefined,
          pickupCity: pickupCity ?? undefined,
          pickupLabel: pickupLabel ?? undefined,
          dropoffLat: delivery.dropoffLat ?? resolved.dropoffLat ?? undefined,
          dropoffLng: delivery.dropoffLng ?? resolved.dropoffLng ?? undefined,
        },
      });
    }

    const radiusKm = RING_RADIUS_KM[ring - 1];
    const alreadyOffered = await this.prisma.dispatchOffer.findMany({
      where: { deliveryId },
      select: { driverId: true },
    });
    const excludeIds = new Set(alreadyOffered.map((o) => o.driverId));

    const candidates = await this.findEligibleDrivers({
      pickupLat,
      pickupLng,
      pickupCity,
      radiusKm,
      ring,
      excludeDriverIds: excludeIds,
    });

    let notified = 0;
    const fee = Number(delivery.fee);
    const orderNumber = delivery.order.orderNumber;
    const shop = pickupLabel || pickupCity || 'shop';
    const dropCity = delivery.order.address?.city || '';

    for (const driver of candidates) {
      try {
        await this.prisma.dispatchOffer.create({
          data: {
            deliveryId,
            driverId: driver.id,
            ring,
            status: 'NOTIFIED',
          },
        });
      } catch {
        // Unique race — already offered
        continue;
      }

      const distPart =
        driver.distanceKm != null
          ? ` · ~${driver.distanceKm.toFixed(1)} km to pickup`
          : '';

      await this.notifications.notify(driver.userId, {
        type: 'DELIVERY',
        title: `New job near you (ring ${ring})`,
        body: `Pickup: ${shop}${distPart}. Drop-off: ${dropCity}. Fee ${fee.toLocaleString('en-TZ')} TZS · ${orderNumber}`,
        data: {
          kind: 'driver_job',
          deliveryId,
          orderId: delivery.orderId,
          orderNumber,
          ring: String(ring),
          link: '/driver',
        },
      });
      notified++;
    }

    const nextAt =
      ring < MAX_RING
        ? new Date(Date.now() + RING_EXPAND_SECONDS * 1000)
        : null;

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        dispatchRing: ring,
        dispatchNextAt: nextAt,
      },
    });

    this.logger.log(
      `Dispatch ring ${ring} for delivery ${deliveryId}: notified ${notified} driver(s), radius ${radiusKm}km, nextAt=${nextAt?.toISOString() ?? 'done'}`,
    );

    return notified;
  }

  /**
   * Drivers who can see / claim this open job (for available-jobs list).
   * Uses same rules as dispatch rings, up to current ring radius (or city).
   */
  async driverCanSeeJob(
    driver: {
      id: string;
      city: string;
      latitude: number | null;
      longitude: number | null;
      locationUpdatedAt: Date | null;
      isOnline: boolean;
      status: string;
    },
    delivery: {
      id: string;
      pickupLat: number | null;
      pickupLng: number | null;
      pickupCity: string | null;
      dispatchRing: number;
      order?: {
        address?: { city?: string | null } | null;
      } | null;
    },
  ): Promise<{ ok: boolean; distanceKm: number | null }> {
    if (driver.status !== 'APPROVED' || !driver.isOnline) {
      return { ok: false, distanceKm: null };
    }

    const declined = await this.prisma.dispatchOffer.findFirst({
      where: {
        deliveryId: delivery.id,
        driverId: driver.id,
        status: 'DECLINED',
      },
    });
    if (declined) return { ok: false, distanceKm: null };

    const ring = Math.max(delivery.dispatchRing || 1, 1);
    const radiusKm = RING_RADIUS_KM[Math.min(ring, MAX_RING) - 1];
    const pickupCity =
      delivery.pickupCity || delivery.order?.address?.city || null;

    const match = this.matchesPickup(driver, {
      pickupLat: delivery.pickupLat,
      pickupLng: delivery.pickupLng,
      pickupCity,
      radiusKm,
      ring,
    });

    return match;
  }

  async recordDecline(deliveryId: string, driverId: string, reason?: string) {
    await this.prisma.dispatchOffer.upsert({
      where: {
        deliveryId_driverId: { deliveryId, driverId },
      },
      create: {
        deliveryId,
        driverId,
        ring: 0,
        status: 'DECLINED',
      },
      update: { status: 'DECLINED' },
    });
    return { message: 'Declined', reason: reason || 'busy', deliveryId };
  }

  private async findEligibleDrivers(opts: {
    pickupLat: number | null;
    pickupLng: number | null;
    pickupCity: string | null;
    radiusKm: number;
    ring: number;
    excludeDriverIds: Set<string>;
  }): Promise<EligibleDriver[]> {
    const drivers = await this.prisma.driverProfile.findMany({
      where: {
        status: 'APPROVED',
        isOnline: true,
        ...(opts.excludeDriverIds.size
          ? { id: { notIn: [...opts.excludeDriverIds] } }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        city: true,
        latitude: true,
        longitude: true,
        locationUpdatedAt: true,
      },
    });

    // Busy drivers (already on an active job)
    const busy = await this.prisma.delivery.findMany({
      where: {
        driverId: { in: drivers.map((d) => d.id) },
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      select: { driverId: true },
    });
    const busyIds = new Set(
      busy.map((b) => b.driverId).filter(Boolean) as string[],
    );

    const out: EligibleDriver[] = [];
    for (const d of drivers) {
      if (busyIds.has(d.id)) continue;
      const m = this.matchesPickup(d, opts);
      if (!m.ok) continue;
      out.push({
        id: d.id,
        userId: d.userId,
        city: d.city,
        latitude: d.latitude,
        longitude: d.longitude,
        locationUpdatedAt: d.locationUpdatedAt,
        distanceKm: m.distanceKm,
      });
    }

    // Prefer closer drivers first
    out.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return out;
  }

  private matchesPickup(
    driver: {
      city: string;
      latitude: number | null;
      longitude: number | null;
      locationUpdatedAt: Date | null;
    },
    opts: {
      pickupLat: number | null;
      pickupLng: number | null;
      pickupCity: string | null;
      radiusKm: number;
      ring: number;
    },
  ): { ok: boolean; distanceKm: number | null } {
    const hasPickupGps =
      opts.pickupLat != null &&
      opts.pickupLng != null &&
      Number.isFinite(opts.pickupLat) &&
      Number.isFinite(opts.pickupLng);

    const locFresh =
      driver.locationUpdatedAt &&
      Date.now() - driver.locationUpdatedAt.getTime() < LOCATION_STALE_MS;

    const hasDriverGps =
      locFresh &&
      driver.latitude != null &&
      driver.longitude != null &&
      Number.isFinite(driver.latitude) &&
      Number.isFinite(driver.longitude);

    // Preferred path: distance from driver → shop
    if (hasPickupGps && hasDriverGps) {
      const distanceKm = haversineKm(
        driver.latitude!,
        driver.longitude!,
        opts.pickupLat!,
        opts.pickupLng!,
      );
      return { ok: distanceKm <= opts.radiusKm, distanceKm };
    }

    // Fallback: city string match (rings 1–2). Ring 3 widens to all online if no GPS.
    if (opts.pickupCity && driver.city) {
      const sameCity =
        driver.city.trim().toLowerCase() ===
        opts.pickupCity.trim().toLowerCase();
      if (sameCity) return { ok: true, distanceKm: null };
    }

    // Last-resort ring 3 without reliable geo: any online approved driver
    if (opts.ring >= MAX_RING && !hasPickupGps) {
      return { ok: true, distanceKm: null };
    }

    // If pickup has GPS but driver has none: city match only
    if (hasPickupGps && opts.pickupCity && driver.city) {
      const sameCity =
        driver.city.trim().toLowerCase() ===
        opts.pickupCity.trim().toLowerCase();
      return { ok: sameCity, distanceKm: null };
    }

    return { ok: false, distanceKm: null };
  }
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
