import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { RestaurantRatingsController } from './ratings.controller';
import { DriverRatingsController } from './ratings.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RatingsController, RestaurantRatingsController, DriverRatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
