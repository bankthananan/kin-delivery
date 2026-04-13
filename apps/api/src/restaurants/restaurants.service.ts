import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeoService } from '../geo/geo.service';
import { OrderStatus } from '@kin-delivery/contracts';

const EARTH_RADIUS_M = 6371000;

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function isCurrentTimeWithinHours(
  openingTime: string | null,
  closingTime: string | null,
): boolean {
  if (!openingTime || !closingTime) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const openMinutes = toMinutes(openingTime);
  const closeMinutes = toMinutes(closingTime);

  if (openMinutes <= closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
  // Overnight span (e.g. 22:00–02:00): wraps past midnight
  return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
  ) {}

  async findNearby(lat: number, lng: number, radiusKm: number) {
    const rawResults = await this.geoService.findNearbyRestaurants(lat, lng, radiusKm);

    return rawResults
      .filter((r: any) =>
        isCurrentTimeWithinHours(r.openingTime ?? null, r.closingTime ?? null),
      )
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isOpen: r.isOpen,
        openingTime: r.openingTime,
        closingTime: r.closingTime,
        lat: r.lat,
        lng: r.lng,
        distanceMeters: Math.round(haversineDistanceMeters(lat, lng, r.lat, r.lng)),
      }));
  }

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: { orderBy: { name: 'asc' } },
          },
        },
      },
    });

    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }

  async getMenu(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }

  private async getRestaurantByOwner(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found for this user');
    return restaurant;
  }

  async toggleStatus(userId: string, isOpen: boolean) {
    const restaurant = await this.getRestaurantByOwner(userId);

    if (!isOpen) {
      await this.prisma.order.updateMany({
        where: {
          restaurantId: restaurant.id,
          status: OrderStatus.PENDING,
        },
        data: { status: OrderStatus.CANCELLED },
      });
    }

    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { isOpen },
      select: { id: true, isOpen: true },
    });
  }

  async createCategory(userId: string, name: string, sortOrder?: number) {
    const restaurant = await this.getRestaurantByOwner(userId);

    return this.prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name,
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  async createMenuItem(
    userId: string,
    categoryId: string,
    data: { name: string; description?: string; price: number },
  ) {
    const restaurant = await this.getRestaurantByOwner(userId);

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.restaurantId !== restaurant.id) {
      throw new ForbiddenException('Category does not belong to your restaurant');
    }

    return this.prisma.menuItem.create({
      data: {
        categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        isAvailable: true,
      },
    });
  }

  async updateMenuItem(
    userId: string,
    itemId: string,
    data: { name?: string; description?: string; price?: number; isAvailable?: boolean },
  ) {
    const restaurant = await this.getRestaurantByOwner(userId);

    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true },
    });

    if (!item) throw new NotFoundException(`Menu item ${itemId} not found`);
    if (item.category.restaurantId !== restaurant.id) {
      throw new ForbiddenException('Item does not belong to your restaurant');
    }

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    });
  }

  async deleteMenuItem(userId: string, itemId: string) {
    const restaurant = await this.getRestaurantByOwner(userId);

    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true },
    });

    if (!item) throw new NotFoundException(`Menu item ${itemId} not found`);
    if (item.category.restaurantId !== restaurant.id) {
      throw new ForbiddenException('Item does not belong to your restaurant');
    }

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: false },
      select: { id: true, isAvailable: true },
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; description?: string; openingTime?: string; closingTime?: string },
  ) {
    const restaurant = await this.getRestaurantByOwner(userId);

    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.openingTime !== undefined && { openingTime: data.openingTime }),
        ...(data.closingTime !== undefined && { closingTime: data.closingTime }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        openingTime: true,
        closingTime: true,
      },
    });
  }
}
