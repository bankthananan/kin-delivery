import { Controller, Post, Get, Body, Query, ParseFloatPipe, BadRequestException } from '@nestjs/common';
import { OrderTier } from '@kin-delivery/database';
import { CartService, CartItem } from './cart.service';
import { PricingService } from './pricing.service';

class ValidateCartDto {
  items: CartItem[];
  deliveryLat: number;
  deliveryLng: number;
  tier: OrderTier;
  customerId: string;
}

@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly pricingService: PricingService,
  ) {}

  @Post('validate')
  async validateCart(@Body() dto: ValidateCartDto) {
    const { items, deliveryLat, deliveryLng, tier, customerId } = dto;

    if (!Object.values(OrderTier).includes(tier)) {
      throw new BadRequestException(`tier ต้องเป็นหนึ่งใน: ${Object.values(OrderTier).join(', ')}`);
    }

    return this.cartService.validateCart(items, deliveryLat, deliveryLng, tier, customerId);
  }

  @Get('delivery-fee')
  async previewDeliveryFee(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('restaurantLat', ParseFloatPipe) restaurantLat: number,
    @Query('restaurantLng', ParseFloatPipe) restaurantLng: number,
    @Query('tier') tier: OrderTier,
  ) {
    if (!Object.values(OrderTier).includes(tier)) {
      throw new BadRequestException(`tier ต้องเป็นหนึ่งใน: ${Object.values(OrderTier).join(', ')}`);
    }

    const R = 6371;
    const dLat = ((lat - restaurantLat) * Math.PI) / 180;
    const dLng = ((lng - restaurantLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((restaurantLat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const surgeMultiplier = await this.pricingService.calculateSurge(lat, lng, 3);
    const deliveryFee = await this.pricingService.calculateDeliveryFee(distanceKm, tier, surgeMultiplier);

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      tier,
      surgeMultiplier,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
    };
  }
}
