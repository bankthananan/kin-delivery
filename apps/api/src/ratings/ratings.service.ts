import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus } from '@kin-delivery/database';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRating(
    customerId: string,
    orderId: string,
    score: number,
    comment?: string,
  ): Promise<any> {
    // Validate score
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new BadRequestException('Score must be an integer between 1 and 5');
    }

    // Check if order exists and belongs to customer
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: true, restaurant: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to this customer');
    }

    // Validate order is DELIVERED
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Order must be DELIVERED to rate. Current status: ${order.status}`,
      );
    }

    // Check if rating already exists (unique constraint on orderId)
    const existingRating = await this.prisma.rating.findUnique({
      where: { orderId },
    });

    if (existingRating) {
      throw new ConflictException('This order has already been rated');
    }

    // Create rating with driver and restaurant IDs from order
    const rating = await this.prisma.rating.create({
      data: {
        orderId,
        customerId,
        driverId: order.driverId,
        restaurantId: order.restaurantId,
        score,
        comment: comment || null,
      },
      include: {
        customer: true,
        driver: true,
        restaurant: true,
      },
    });

    return rating;
  }

  async getRestaurantRatings(
    restaurantId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<any> {
    // Validate restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Get paginated ratings
    const skip = (page - 1) * pageSize;
    const ratings = await this.prisma.rating.findMany({
      where: { restaurantId },
      skip,
      take: pageSize,
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average
    const allRatings = await this.prisma.rating.findMany({
      where: { restaurantId },
      select: { score: true },
    });

    const average =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length
        : 0;

    return {
      average: Math.round(average * 10) / 10,
      count: allRatings.length,
      ratings,
      page,
      pageSize,
      totalPages: Math.ceil(allRatings.length / pageSize),
    };
  }

  async getDriverRating(driverId: string): Promise<any> {
    // Validate driver exists
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    // Get all ratings for driver
    const ratings = await this.prisma.rating.findMany({
      where: { driverId },
      select: { score: true },
    });

    // Count total deliveries
    const totalDeliveries = await this.prisma.order.count({
      where: {
        driverId,
        status: OrderStatus.DELIVERED,
      },
    });

    // Calculate average
    const average =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : 0;

    return {
      average: Math.round(average * 10) / 10,
      totalDeliveries,
      ratingCount: ratings.length,
    };
  }
}
