import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { RatingsService } from './ratings.service';
import { Role } from '@kin-delivery/contracts';

class CreateRatingDto {
  score: number;
  comment?: string;
}

@Controller('orders')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async createRating(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
    @Body() dto: CreateRatingDto,
  ): Promise<any> {
    return this.ratingsService.createRating(user.sub, orderId, dto.score, dto.comment);
  }
}

@Controller('restaurants')
export class RestaurantRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get(':id/ratings')
  @HttpCode(HttpStatus.OK)
  async getRestaurantRatings(
    @Param('id') restaurantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ): Promise<any> {
    return this.ratingsService.getRestaurantRatings(restaurantId, page, pageSize);
  }
}

@Controller('drivers')
export class DriverRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get(':id/rating')
  @HttpCode(HttpStatus.OK)
  async getDriverRating(@Param('id') driverId: string): Promise<any> {
    return this.ratingsService.getDriverRating(driverId);
  }
}
