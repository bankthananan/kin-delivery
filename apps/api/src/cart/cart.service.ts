import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderTier } from '@kin-delivery/database';
import { PrismaService } from '../database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { PricingService } from './pricing.service';

export interface CartItem {
  menuItemId: string;
  restaurantId: string;
  price: number;
  quantity: number;
}

export interface CartValidationResult {
  valid: true;
  deliveryFee: number;
  surgeMultiplier: number;
  estimatedTotal: number;
}

export interface CartValidationError {
  valid: false;
  errors: string[];
}

const MIN_ORDER_PER_RESTAURANT = 100;
const MAX_DETOUR_METERS = 500;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly pricingService: PricingService,
  ) {}

  async validateCart(
    items: CartItem[],
    deliveryLat: number,
    deliveryLng: number,
    tier: OrderTier,
    customerId: string,
  ): Promise<CartValidationResult | CartValidationError> {
    if (!items || items.length === 0) {
      return { valid: false, errors: ['Cart is empty'] };
    }

    const errors: string[] = [];

    const byRestaurant = items.reduce<Record<string, CartItem[]>>((acc, item) => {
      acc[item.restaurantId] = acc[item.restaurantId] ?? [];
      acc[item.restaurantId].push(item);
      return acc;
    }, {});

    const restaurantIds = Object.keys(byRestaurant);

    for (const [restaurantId, restaurantItems] of Object.entries(byRestaurant)) {
      const subtotal = restaurantItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      if (subtotal < MIN_ORDER_PER_RESTAURANT) {
        errors.push(
          `ยอดสั่งซื้อขั้นต่ำสำหรับร้าน ${restaurantId} คือ ${MIN_ORDER_PER_RESTAURANT} บาท (ปัจจุบัน ${subtotal} บาท)`,
        );
      }
    }

    if (restaurantIds.length > 1) {
      if (tier === OrderTier.SAVER) {
        errors.push('ไม่สามารถใช้ tier SAVER สำหรับการสั่งจากหลายร้านได้');
      }

      const restaurants = await this.prisma.restaurant.findMany({
        where: { id: { in: restaurantIds } },
        select: { id: true, lat: true, lng: true },
      });

      const restaurantLocations = restaurants.map((r) => ({ lat: r.lat, lng: r.lng }));
      const customerLocation = { lat: deliveryLat, lng: deliveryLng };

      const detourMeters = await this.geoService.calculateDetour(restaurantLocations, customerLocation);
      if (detourMeters > MAX_DETOUR_METERS) {
        errors.push(
          `เส้นทางอ้อมเกิน ${MAX_DETOUR_METERS} เมตรสำหรับการสั่งจากหลายร้าน (${Math.round(detourMeters)} เมตร)`,
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const firstRestaurantId = restaurantIds[0];
    const firstRestaurant = await this.prisma.restaurant.findUnique({
      where: { id: firstRestaurantId },
      select: { lat: true, lng: true },
    });

    if (!firstRestaurant) {
      throw new BadRequestException(`ไม่พบร้านอาหาร ${firstRestaurantId}`);
    }

    const distanceKm = haversineKm(firstRestaurant.lat, firstRestaurant.lng, deliveryLat, deliveryLng);
    const surgeMultiplier = await this.pricingService.getOrComputeSurge(customerId, deliveryLat, deliveryLng);
    const deliveryFee = await this.pricingService.calculateDeliveryFee(distanceKm, tier, surgeMultiplier);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return {
      valid: true,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      surgeMultiplier,
      estimatedTotal: Math.round((subtotal + deliveryFee) * 100) / 100,
    };
  }
}
