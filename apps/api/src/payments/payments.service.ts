import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from '../deliveries/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';

export type InitiatePaymentInput = {
  orderId: string;
  amount: number;
  phone?: string;
  orderNumber: string;
};

/**
 * ClickPesa payment integration.
 * In development without API keys, auto-completes payment after a short delay (mock).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private dispatch: DispatchService,
    private notifications: NotificationsService,
  ) {}

  async initiatePayment(input: InitiatePaymentInput) {
    const apiKey = this.config.get<string>('CLICKPESA_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        `ClickPesa not configured — mock payment for ${input.orderNumber}`,
      );
      const mockRef = `MOCK-${input.orderNumber}`;
      await this.prisma.payment.update({
        where: { orderId: input.orderId },
        data: {
          status: 'PROCESSING',
          providerRef: mockRef,
          phone: input.phone,
        },
      });

      // Auto-complete mock payments so local demo works
      setTimeout(() => {
        void this.handleWebhook({
          reference: mockRef,
          orderId: input.orderId,
          status: 'SUCCESS',
          amount: input.amount,
        });
      }, 2000);

      return {
        provider: 'mock',
        status: 'PROCESSING',
        message:
          'Mock payment initiated. Will auto-complete in ~2s (dev mode).',
        reference: mockRef,
      };
    }

    // Real ClickPesa flow (structure for integration)
    try {
      const baseUrl = this.config.get(
        'CLICKPESA_API_URL',
        'https://api.clickpesa.com/v1',
      );
      const res = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount: input.amount,
          currency: 'TZS',
          phone: input.phone,
          reference: input.orderNumber,
          metadata: { orderId: input.orderId },
        }),
      });

      const data = (await res.json()) as {
        reference?: string;
        status?: string;
        message?: string;
      };

      await this.prisma.payment.update({
        where: { orderId: input.orderId },
        data: {
          status: 'PROCESSING',
          providerRef: data.reference,
          phone: input.phone,
          metadata: data as object,
        },
      });

      return {
        provider: 'clickpesa',
        status: data.status ?? 'PROCESSING',
        message: data.message ?? 'Payment initiated',
        reference: data.reference,
      };
    } catch (err) {
      this.logger.error('ClickPesa initiate failed', err);
      await this.prisma.payment.update({
        where: { orderId: input.orderId },
        data: { status: 'FAILED' },
      });
      return {
        provider: 'clickpesa',
        status: 'FAILED',
        message: 'Payment initiation failed',
      };
    }
  }

  async handleWebhook(payload: {
    reference?: string;
    orderId?: string;
    status: string;
    amount?: number;
  }) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          payload.reference ? { providerRef: payload.reference } : undefined,
          payload.orderId ? { orderId: payload.orderId } : undefined,
        ].filter(Boolean) as { providerRef?: string; orderId?: string }[],
      },
    });

    if (!payment) {
      this.logger.warn('Webhook for unknown payment', payload);
      return { ok: false };
    }

    if (payment.status === 'COMPLETED') {
      return { ok: true, already: true };
    }

    const success =
      payload.status === 'SUCCESS' ||
      payload.status === 'COMPLETED' ||
      payload.status === 'success';

    if (!success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', metadata: payload as object },
      });
      return { ok: true, status: 'FAILED' };
    }

    await this.completePayment(payment.orderId, payload.reference);
    return { ok: true, status: 'COMPLETED' };
  }

  async completePayment(orderId: string, providerRef?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, escrow: true, address: true },
    });
    if (!order || order.escrow) return order;

    const pickup = await this.dispatch.resolvePickup(orderId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: 'COMPLETED',
          providerRef: providerRef ?? order.payment?.providerRef,
          paidAt: new Date(),
        },
      });

      await tx.escrow.create({
        data: {
          orderId,
          amount: order.total,
          platformFee: order.platformFee,
          sellerAmount: Number(order.subtotal) - Number(order.platformFee),
          status: 'HELD',
        },
      });

      await tx.delivery.create({
        data: {
          orderId,
          status: 'REQUESTED',
          fee: order.deliveryFee,
          pickupLat: pickup.lat ?? undefined,
          pickupLng: pickup.lng ?? undefined,
          pickupCity: pickup.city ?? undefined,
          pickupLabel: pickup.label ?? undefined,
          dropoffLat: pickup.dropoffLat ?? order.address?.latitude ?? undefined,
          dropoffLng: pickup.dropoffLng ?? order.address?.longitude ?? undefined,
          dispatchRing: 0,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'AWAITING_DRIVER' },
        include: { escrow: true, delivery: true, payment: true },
      });
    });

    await this.notifications.notify(order.customerId, {
      type: 'PAYMENT',
      title: 'Payment received',
      body: `Your payment for ${order.orderNumber} is held in escrow until delivery`,
      data: { orderId, link: `/orders/${orderId}` },
    });

    // Marketplace dispatch: ring 1 around shop (async, non-blocking for webhook)
    const deliveryId = updated.delivery?.id;
    if (deliveryId) {
      void this.dispatch.startDispatch(deliveryId);
    }

    return updated;
  }
}
