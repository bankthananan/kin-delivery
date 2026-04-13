import { Injectable, Inject } from '@nestjs/common';
import { MapboxClient, Coordinates } from '@kin-delivery/mapbox-client';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';
import { PrismaService } from '../database/prisma.service';

const DRIVERS_KEY = 'drivers:active';
const EARTH_RADIUS_METERS = 6371000;

@Injectable()
export class GeoService {
  private readonly mapbox: MapboxClient;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {
    this.mapbox = new MapboxClient();
  }

  async findNearbyRestaurants(lat: number, lng: number, radiusKm: number) {
    const radiusMeters = radiusKm * 1000;
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Restaurant"
       WHERE ST_DWithin(location, ST_GeogFromText('POINT(${lng} ${lat})'), ${radiusMeters})
       AND "isOpen" = true
       ORDER BY ST_Distance(location, ST_GeogFromText('POINT(${lng} ${lat})'))`,
    );
  }

  async addDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.redis.geoadd(DRIVERS_KEY, lng, lat, driverId);
  }

  async removeDriverLocation(driverId: string): Promise<void> {
    await this.redis.zrem(DRIVERS_KEY, driverId);
  }

  async findNearbyDrivers(lat: number, lng: number, radiusKm: number) {
    const results = await this.redis.georadius(
      DRIVERS_KEY,
      lng,
      lat,
      radiusKm,
      'km',
      'WITHCOORD',
      'WITHDIST',
      'ASC',
      'COUNT',
      20,
    );
    return results;
  }

  async calculateDetour(
    restaurantLocations: Coordinates[],
    customerLocation: Coordinates,
  ): Promise<number> {
    if (restaurantLocations.length === 0) return 0;

    const firstRestaurant = restaurantLocations[0];
    const directRoute = await this.mapbox.getDistance(firstRestaurant, customerLocation);

    const allWaypoints = [...restaurantLocations, customerLocation];
    const multiStopRoute = await this.mapbox.getRouteWithWaypoints(allWaypoints);

    return multiStopRoute.totalDistanceMeters - directRoute.distanceMeters;
  }

  isWithinRadius(
    pointA: Coordinates,
    pointB: Coordinates,
    radiusMeters: number,
  ): boolean {
    const dLat = toRadians(pointB.lat - pointA.lat);
    const dLng = toRadians(pointB.lng - pointA.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(pointA.lat)) *
        Math.cos(toRadians(pointB.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = EARTH_RADIUS_METERS * c;

    return distanceMeters <= radiusMeters;
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
