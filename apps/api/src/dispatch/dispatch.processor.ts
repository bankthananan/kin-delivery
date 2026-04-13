import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ORDER_DISPATCH_QUEUE } from './dispatch.module';
import { OrderTier, OrderStatus } from '@kin-delivery/database';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
];

const CAPACITY_LIMIT: Record<OrderTier, number> = {
  [OrderTier.FASTEST]: 0,
  [OrderTier.NORMAL]: 2,
  [OrderTier.SAVER]: 3,
};

@Processor(ORDER_DISPATCH_QUEUE)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly gateway: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>): Promise<void> {
    const { orderId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found — skipping dispatch`);
      return;
    }

    const [nearRestaurant, nearDelivery] = await Promise.all([
      this.geoService.findNearbyDrivers(order.restaurant.lat, order.restaurant.lng, 5),
      this.geoService.findNearbyDrivers(order.deliveryLat, order.deliveryLng, 5),
    ]);

    const combined = [...nearRestaurant, ...nearDelivery] as Array<[string, string, [string, string]]>;
    const seen = new Set<string>();
    const candidates: Array<{ driverId: string; distKm: number }> = [];

    for (const entry of combined) {
      const driverId = entry[0];
      const distKm = parseFloat(entry[1]);
      if (!seen.has(driverId)) {
        seen.add(driverId);
        candidates.push({ driverId, distKm });
      }
    }

    const eligible: Array<{ driverId: string; distKm: number }> = [];

    for (const { driverId, distKm } of candidates) {
      const activeCount = await this.prisma.order.count({
        where: {
          driverId,
          status: { in: ACTIVE_STATUSES },
        },
      });

      const fastestActiveCount = await this.prisma.order.count({
        where: {
          driverId,
          tier: OrderTier.FASTEST,
          status: { in: ACTIVE_STATUSES },
        },
      });

      const maxActive = CAPACITY_LIMIT[order.tier];

      if (order.tier === OrderTier.FASTEST && activeCount > 0) continue;
      if (order.tier === OrderTier.NORMAL && (activeCount >= maxActive || fastestActiveCount > 0)) continue;
      if (order.tier === OrderTier.SAVER && (activeCount >= maxActive || fastestActiveCount > 0)) continue;

      eligible.push({ driverId, distKm });
    }

    eligible.sort((a, b) => a.distKm - b.distKm);
    const top5 = eligible.slice(0, 5);

    if (top5.length === 0) {
      this.logger.warn(`No eligible drivers for order ${orderId} — will retry`);
      throw new Error('No eligible drivers found');
    }

    const driverIds = top5.map((d) => d.driverId);
    this.logger.log(`order.ping — order ${orderId} → drivers [${driverIds.join(', ')}]`);

    const orderPayload = { orderId, restaurant: order.restaurant };
    for (const { driverId } of top5) {
      const socketId = this.gateway.getSocketIdByUserId(driverId);
      if (socketId) {
        this.gateway.emitOrderPing(socketId, orderPayload);
      }
    }
  }
}
