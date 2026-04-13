import { Injectable, Inject } from '@nestjs/common';
import { OrderTier, OrderStatus } from '@kin-delivery/database';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { REDIS_CLIENT } from '../geo/redis.provider';

const TIER_MULTIPLIERS: Record<OrderTier, number> = {
  [OrderTier.FASTEST]: 1.5,
  [OrderTier.NORMAL]: 1.0,
  [OrderTier.SAVER]: 0.7,
};

const SURGE_LOCK_TTL = 600;
const DEFAULT_BASE_FEE = 25;
const DEFAULT_DISTANCE_RATE = 8;
const DEFAULT_SURGE_THRESHOLD = 0.5;
const DEFAULT_SURGE_RADIUS_KM = 3;

function surgeKey(customerId: string): string {
  return `surge:lock:${customerId}`;
}

// 1 degree latitude ≈ 111 km — used for bounding-box pre-filter on order count query
function kmToDeg(km: number): number {
  return km / 111;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async calculateDeliveryFee(
    distanceKm: number,
    tier: OrderTier,
    surgeMultiplier: number,
  ): Promise<number> {
    const [baseFeeRow, distanceRateRow] = await Promise.all([
      this.prisma.platformConfig.findUnique({ where: { key: 'delivery.baseFee' } }),
      this.prisma.platformConfig.findUnique({ where: { key: 'delivery.distanceRate' } }),
    ]);

    const baseFee = baseFeeRow ? parseFloat(baseFeeRow.value) : DEFAULT_BASE_FEE;
    const distanceRate = distanceRateRow ? parseFloat(distanceRateRow.value) : DEFAULT_DISTANCE_RATE;
    const tierMultiplier = TIER_MULTIPLIERS[tier];

    // Formula: (baseFee + max(0, (distanceKm - 2) * distanceRate)) * tierMultiplier * surgeMultiplier
    return (baseFee + Math.max(0, (distanceKm - 2) * distanceRate)) * tierMultiplier * surgeMultiplier;
  }

  async calculateSurge(lat: number, lng: number, radiusKm: number): Promise<number> {
    const [nearbyDrivers, thresholdRow] = await Promise.all([
      this.geoService.findNearbyDrivers(lat, lng, radiusKm),
      this.prisma.platformConfig.findUnique({ where: { key: 'surge.threshold' } }),
    ]);

    const driverCount = nearbyDrivers.length;
    const threshold = thresholdRow ? parseFloat(thresholdRow.value) : DEFAULT_SURGE_THRESHOLD;

    const radiusDeg = kmToDeg(radiusKm);
    const orderCount = await this.prisma.order.count({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        deliveryLat: { gte: lat - radiusDeg, lte: lat + radiusDeg },
        deliveryLng: { gte: lng - radiusDeg, lte: lng + radiusDeg },
      },
    });

    if (orderCount === 0) return 1.0;

    const ratio = driverCount / orderCount;
    return ratio < threshold ? 1.5 : 1.0;
  }

  async lockSurge(customerId: string, surgeMultiplier: number): Promise<void> {
    await this.redis.set(surgeKey(customerId), surgeMultiplier.toString(), 'EX', SURGE_LOCK_TTL);
  }

  async getSurge(customerId: string): Promise<number> {
    const locked = await this.redis.get(surgeKey(customerId));
    return locked !== null ? parseFloat(locked) : 1.0;
  }

  async getOrComputeSurge(customerId: string, lat: number, lng: number): Promise<number> {
    const locked = await this.redis.get(surgeKey(customerId));
    if (locked !== null) return parseFloat(locked);

    const surge = await this.calculateSurge(lat, lng, DEFAULT_SURGE_RADIUS_KM);
    await this.lockSurge(customerId, surge);
    return surge;
  }
}
