import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { OrderStatus } from '@kin-delivery/database';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
];

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
  ) {}

  async setOnline(driverId: string, lat: number, lng: number): Promise<void> {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    await Promise.all([
      this.prisma.driver.update({
        where: { id: driverId },
        data: { isOnline: true, currentLat: lat, currentLng: lng },
      }),
      this.geoService.addDriverLocation(driverId, lat, lng),
    ]);
  }

  async setOffline(driverId: string): Promise<void> {
    await Promise.all([
      this.prisma.driver.update({
        where: { id: driverId },
        data: { isOnline: false },
      }),
      this.geoService.removeDriverLocation(driverId),
    ]);
  }

  async updateLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await Promise.all([
      this.prisma.driver.update({
        where: { id: driverId },
        data: { currentLat: lat, currentLng: lng },
      }),
      this.geoService.addDriverLocation(driverId, lat, lng),
    ]);
  }

  async getActiveOrders(driverId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: {
        driverId,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        restaurant: { select: { id: true, name: true, lat: true, lng: true } },
        items: { include: { menuItem: { select: { name: true, price: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
