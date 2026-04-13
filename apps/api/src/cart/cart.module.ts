import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GeoModule } from '../geo/geo.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [DatabaseModule, GeoModule],
  controllers: [CartController],
  providers: [CartService, PricingService],
  exports: [CartService, PricingService],
})
export class CartModule {}
