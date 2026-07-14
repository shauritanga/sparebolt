import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, DisputeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [
      users,
      sellers,
      drivers,
      listings,
      orders,
      heldEscrow,
      openDisputes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.sellerProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.driverProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.listing.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.escrow.aggregate({
        where: { status: 'HELD' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.dispute.count({ where: { status: 'OPEN' } }),
    ]);

    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        payment: true,
      },
    });

    return {
      stats: {
        users,
        sellers,
        drivers,
        listings,
        orders,
        escrowHeld: Number(heldEscrow._sum.amount ?? 0),
        escrowCount: heldEscrow._count,
        openDisputes,
      },
      recentOrders,
    };
  }

  async listUsers(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as never } : undefined,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        sellerProfile: true,
        driverProfile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async setUserActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  async listSellers(status?: string) {
    return this.prisma.sellerProfile.findMany({
      where: status ? { status: status as ApprovalStatus } : undefined,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async approveSeller(
    sellerId: string,
    status: ApprovalStatus,
    rejectionReason?: string,
  ) {
    const profile = await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        status,
        rejectionReason:
          status === 'REJECTED' ? rejectionReason || 'Rejected by admin' : null,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'APPROVAL',
        title:
          status === 'APPROVED'
            ? 'Seller account approved'
            : status === 'REJECTED'
              ? 'Seller application rejected'
              : `Seller status: ${status}`,
        body:
          status === 'APPROVED'
            ? 'You can now create listings and sell parts.'
            : rejectionReason || `Your seller status is now ${status}`,
      },
    });

    return profile;
  }

  async listDrivers(status?: string) {
    return this.prisma.driverProfile.findMany({
      where: status ? { status: status as ApprovalStatus } : undefined,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async approveDriver(
    driverId: string,
    status: ApprovalStatus,
    rejectionReason?: string,
  ) {
    const profile = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        status,
        licenseVerified: status === 'APPROVED',
        rejectionReason:
          status === 'REJECTED' ? rejectionReason || 'Rejected by admin' : null,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'APPROVAL',
        title:
          status === 'APPROVED'
            ? 'Driver account approved'
            : status === 'REJECTED'
              ? 'Driver application rejected'
              : `Driver status: ${status}`,
        body:
          status === 'APPROVED'
            ? 'You can now go online and accept delivery jobs.'
            : rejectionReason || `Your driver status is now ${status}`,
      },
    });

    return profile;
  }

  async listDisputes() {
    return this.prisma.dispute.findMany({
      include: {
        order: {
          include: {
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
            escrow: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: 'customer' | 'seller',
    notes?: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: { include: { escrow: true } } },
    });
    if (!dispute) throw new NotFoundException();

    const status: DisputeStatus =
      resolution === 'customer' ? 'RESOLVED_CUSTOMER' : 'RESOLVED_SELLER';

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolution: notes,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      });

      if (resolution === 'customer' && dispute.order.escrow) {
        await tx.escrow.update({
          where: { orderId: dispute.orderId },
          data: {
            status: 'REFUNDED_TO_CUSTOMER',
            refundedAt: new Date(),
            notes,
          },
        });
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: 'REFUNDED' },
        });
        await tx.payment.update({
          where: { orderId: dispute.orderId },
          data: { status: 'REFUNDED' },
        });
      } else if (dispute.order.escrow) {
        await tx.escrow.update({
          where: { orderId: dispute.orderId },
          data: {
            status: 'RELEASED_TO_SELLER',
            releasedAt: new Date(),
            notes,
          },
        });
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
      }
    });

    return this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: { include: { escrow: true } } },
    });
  }

  async moderateListing(listingId: string, isActive: boolean) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { isActive },
    });
  }

  async listEscrows() {
    return this.prisma.escrow.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            customerId: true,
            total: true,
          },
        },
      },
      orderBy: { heldAt: 'desc' },
      take: 100,
    });
  }
}
