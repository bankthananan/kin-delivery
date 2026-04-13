import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAddress } from '@kin-delivery/contracts';

const EARTH_RADIUS_M = 6371000;

function haversineDistance(
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

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(customerId: string) {
    return this.prisma.address.findMany({ where: { customerId } });
  }

  async createAddress(customerId: string, dto: CreateAddress) {
    return this.prisma.address.create({
      data: {
        customerId,
        label: dto.label,
        lat: dto.lat,
        lng: dto.lng,
        addressStr: dto.addressStr,
      },
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (address.customerId !== customerId) {
      throw new ForbiddenException('Cannot delete another customer\'s address');
    }

    await this.prisma.address.delete({ where: { id: addressId } });
    return { deleted: true };
  }

  async nearestAddress(customerId: string, lat: number, lng: number) {
    const addresses = await this.prisma.address.findMany({ where: { customerId } });

    const THRESHOLD_METERS = 200;

    let nearest: (typeof addresses)[0] | null = null;
    let nearestDist = Infinity;

    for (const addr of addresses) {
      const dist = haversineDistance(lat, lng, addr.lat, addr.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = addr;
      }
    }

    if (!nearest || nearestDist > THRESHOLD_METERS) {
      return null;
    }

    return { ...nearest, distanceMeters: Math.round(nearestDist) };
  }
}
