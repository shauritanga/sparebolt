import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SyncCartDto } from './cart.dto';

/** Reminder offsets from last cart activity (ms) */
const REMINDER_OFFSETS_MS = [
  30 * 60 * 1000, // 30 minutes — first nudge
  24 * 60 * 60 * 1000, // 24 hours
  48 * 60 * 60 * 1000, // 48 hours
] as const;

const MAX_REMINDERS = 3;

/** Quiet hours in Africa/Dar_es_Salaam (EAT, UTC+3) */
const QUIET_START_HOUR = 22;
const QUIET_END_HOUR = 7;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Upsert cart snapshot for a logged-in user.
   * Empty cart clears recovery schedule.
   */
  async sync(userId: string, dto: SyncCartDto) {
    const items = (dto.items || []).filter((i) => i.quantity > 0);
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + Number(i.price) * i.quantity, 0);
    const now = new Date();

    if (itemCount === 0) {
      await this.prisma.cartSnapshot.deleteMany({ where: { userId } });
      return { ok: true, cleared: true };
    }

    const compact = items.map((i) => ({
      listingId: i.listingId,
      title: i.title,
      price: Number(i.price),
      quantity: i.quantity,
      image: i.image,
      city: i.city,
    }));

    const nextReminderAt = this.adjustForQuietHours(
      new Date(now.getTime() + REMINDER_OFFSETS_MS[0]),
    );

    await this.prisma.cartSnapshot.upsert({
      where: { userId },
      create: {
        userId,
        items: compact as Prisma.InputJsonValue,
        itemCount,
        subtotal,
        lastActivityAt: now,
        remindersSent: 0,
        lastReminderAt: null,
        nextReminderAt,
      },
      update: {
        items: compact as Prisma.InputJsonValue,
        itemCount,
        subtotal,
        lastActivityAt: now,
        // Reset recovery cycle when user keeps shopping
        remindersSent: 0,
        lastReminderAt: null,
        nextReminderAt,
      },
    });

    this.logger.log(
      `Cart synced user=${userId} items=${itemCount} nextReminder=${nextReminderAt.toISOString()}`,
    );

    return {
      ok: true,
      itemCount,
      nextReminderAt,
    };
  }

  async clear(userId: string) {
    await this.prisma.cartSnapshot.deleteMany({ where: { userId } });
    return { ok: true, cleared: true };
  }

  /** Process due abandoned-cart reminders every 5 minutes */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processAbandonedCarts() {
    const now = new Date();
    const due = await this.prisma.cartSnapshot.findMany({
      where: {
        itemCount: { gt: 0 },
        remindersSent: { lt: MAX_REMINDERS },
        nextReminderAt: { lte: now, not: null },
      },
      take: 100,
      orderBy: { nextReminderAt: 'asc' },
    });

    if (!due.length) {
      this.logger.debug('Cart recovery: nothing due');
      return;
    }

    this.logger.log(`Cart recovery: ${due.length} snapshot(s) due`);

    for (const snap of due) {
      try {
        await this.sendReminder(snap.id);
      } catch (err) {
        this.logger.warn(
          `Cart reminder failed for ${snap.userId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  private async sendReminder(snapshotId: string) {
    const snap = await this.prisma.cartSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snap || snap.itemCount <= 0 || snap.remindersSent >= MAX_REMINDERS) {
      return;
    }

    // Skip if still in quiet hours — push nextReminder to morning
    if (this.isQuietHours(new Date())) {
      const next = this.nextMorning(new Date());
      await this.prisma.cartSnapshot.update({
        where: { id: snap.id },
        data: { nextReminderAt: next },
      });
      return;
    }

    const step = snap.remindersSent; // 0, 1, 2
    const items = (snap.items as Array<{ title?: string; quantity?: number }>) || [];
    const firstTitle = items[0]?.title || 'your parts';
    const more =
      snap.itemCount > 1
        ? ` and ${snap.itemCount - (items[0]?.quantity || 1)} more`
        : '';

    const copy = [
      {
        title: 'Still thinking it over?',
        body: `${firstTitle}${more} ${snap.itemCount === 1 ? 'is' : 'are'} waiting in your cart.`,
      },
      {
        title: 'Your cart is waiting',
        body: `Complete checkout for ${firstTitle}${more}. Escrow keeps your payment safe.`,
      },
      {
        title: 'Last reminder: cart reserved for you',
        body: `${snap.itemCount} item(s) still in your cart — checkout when you're ready.`,
      },
    ][step];

    // Push only for cart recovery (avoid cluttering in-app feed every time)
    // First reminder also creates an in-app row so they see it in Notifications.
    // Always in-app + FCM so recovery is visible even if push permission denied
    await this.notifications.notify(snap.userId, {
      type: 'SYSTEM',
      title: copy.title,
      body: copy.body,
      data: { kind: 'cart_recovery', step: String(step + 1), link: '/cart' },
    });

    const newSent = snap.remindersSent + 1;
    let nextReminderAt: Date | null = null;
    if (newSent < MAX_REMINDERS) {
      const offset = REMINDER_OFFSETS_MS[newSent];
      nextReminderAt = this.adjustForQuietHours(
        new Date(snap.lastActivityAt.getTime() + offset),
      );
      // If computed next is still in the past (e.g. activity old), schedule soon after quiet
      if (nextReminderAt.getTime() <= Date.now()) {
        nextReminderAt = this.adjustForQuietHours(
          new Date(Date.now() + 60 * 60 * 1000),
        );
      }
    }

    await this.prisma.cartSnapshot.update({
      where: { id: snap.id },
      data: {
        remindersSent: newSent,
        lastReminderAt: new Date(),
        nextReminderAt,
      },
    });

    this.logger.log(
      `Cart reminder #${newSent} sent to user ${snap.userId} (next=${nextReminderAt?.toISOString() ?? 'done'})`,
    );
  }

  /** Dev / ops: how many open carts are scheduled */
  async recoveryStats() {
    const [open, dueSoon] = await Promise.all([
      this.prisma.cartSnapshot.count({
        where: { itemCount: { gt: 0 }, remindersSent: { lt: MAX_REMINDERS } },
      }),
      this.prisma.cartSnapshot.count({
        where: {
          itemCount: { gt: 0 },
          remindersSent: { lt: MAX_REMINDERS },
          nextReminderAt: { lte: new Date(Date.now() + 60 * 60 * 1000) },
        },
      }),
    ]);
    return { openCarts: open, dueWithinHour: dueSoon };
  }

  /** Shift a target time out of quiet hours (22:00–07:00 EAT). */
  adjustForQuietHours(date: Date): Date {
    if (!this.isQuietHours(date)) return date;
    return this.nextMorning(date);
  }

  isQuietHours(date: Date): boolean {
    const hour = this.eatHour(date);
    return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
  }

  nextMorning(from: Date): Date {
    // 08:00 EAT = 05:00 UTC
    const d = new Date(from);
    // Work in EAT by adding 3h, set to 08:00, convert back
    const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    const y = eat.getUTCFullYear();
    const m = eat.getUTCMonth();
    const day = eat.getUTCDate();
    const hour = eat.getUTCHours();
    // If before 07:00 EAT, today 08:00 EAT; if after 22:00, tomorrow 08:00 EAT
    let targetDay = day;
    if (hour >= QUIET_START_HOUR) targetDay = day + 1;
    // 08:00 EAT = 05:00 UTC
    return new Date(Date.UTC(y, m, targetDay, 5, 0, 0, 0));
  }

  eatHour(date: Date): number {
    const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return eat.getUTCHours();
  }
}
