import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus, TransactionType } from '@kin-delivery/database';
import { Role } from '@kin-delivery/contracts';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [ordersByStatus, revenueToday, activeDrivers, activeRestaurants, totalCustomers, totalDrivers, totalRestaurants] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['status'],
          where: { createdAt: { gte: today, lt: tomorrow } },
          _count: { status: true },
        }),
        this.prisma.order.aggregate({
          where: { status: OrderStatus.DELIVERED, createdAt: { gte: today, lt: tomorrow } },
          _sum: { total: true },
        }),
        this.prisma.driver.count({ where: { isOnline: true } }),
        this.prisma.restaurant.count({ where: { isOpen: true } }),
        this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
        this.prisma.user.count({ where: { role: Role.DRIVER } }),
        this.prisma.restaurant.count(),
      ]);

    const ordersToday = (ordersByStatus as Array<{ status: string; _count: { status: number } }>).reduce(
      (acc, row) => {
        acc[row.status] = row._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ordersToday,
      revenueToday: revenueToday._sum.total ?? 0,
      activeDrivers,
      activeRestaurants,
      totalCustomers,
      totalDrivers,
      totalRestaurants,
    };
  }

  async listUsers(role?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = role ? { role: role as Role } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, phone: true, role: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listOrders(status?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = status ? { status: status as OrderStatus } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { include: { user: { select: { email: true, phone: true } } } },
          restaurant: { select: { id: true, name: true } },
          driver: { include: { user: { select: { email: true, phone: true } } } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listRestaurants() {
    const restaurants = await this.prisma.restaurant.findMany({
      include: {
        _count: { select: { orders: true } },
      },
    });

    const earnings = await this.prisma.order.groupBy({
      by: ['restaurantId'],
      where: { status: OrderStatus.DELIVERED },
      _sum: { total: true },
    });

    const earningMap = new Map(
      (earnings as Array<{ restaurantId: string; _sum: { total: any } }>).map((e) => [
        e.restaurantId,
        e._sum.total ?? 0,
      ]),
    );

    return restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      isOpen: r.isOpen,
      orderCount: r._count.orders,
      totalEarnings: earningMap.get(r.id) ?? 0,
      createdAt: r.createdAt,
    }));
  }

  async listDrivers() {
    const drivers = await this.prisma.driver.findMany({
      include: {
        user: { select: { email: true, phone: true } },
        _count: { select: { deliveries: true } },
        ratings: { select: { score: true } },
      },
    });

    return drivers.map((d) => {
      const avgRating =
        d.ratings.length > 0
          ? d.ratings.reduce((sum, r) => sum + r.score, 0) / d.ratings.length
          : null;

      return {
        id: d.id,
        email: d.user.email,
        phone: d.user.phone,
        vehiclePlate: d.vehiclePlate,
        isOnline: d.isOnline,
        deliveryCount: d._count.deliveries,
        avgRating,
      };
    });
  }

  async getFinancesSummary() {
    const [totalRevenue, totalPayouts, wallets] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED },
        _sum: { total: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.PAYOUT },
        _sum: { amount: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
    ]);

    const revenue = Number(totalRevenue._sum.total ?? 0);
    const payouts = Number(totalPayouts._sum.amount ?? 0);

    return {
      totalRevenue: revenue,
      totalCommission: revenue - payouts,
      totalPayouts: payouts,
      totalWalletBalance: Number(wallets._sum.balance ?? 0),
    };
  }

  async listTransactions(type?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = type ? { type: type as TransactionType } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            select: { id: true, customerId: true, driverId: true, restaurantId: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getConfig() {
    return this.prisma.platformConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertConfig(key: string, value: string) {
    return this.prisma.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
