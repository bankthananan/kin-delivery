import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { Register, Role } from '@kin-delivery/contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: Register) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: dto.role as any,
        },
      });

      if (dto.role === Role.CUSTOMER) {
        await tx.customer.create({ data: { id: newUser.id } });
        await tx.wallet.create({ data: { customerId: newUser.id } });
      } else if (dto.role === Role.DRIVER) {
        await tx.driver.create({
          data: {
            id: newUser.id,
            vehiclePlate: '',
          },
        });
      } else if (dto.role === Role.RESTAURANT) {
        const restaurant = await tx.restaurant.create({
          data: {
            userId: newUser.id,
            name: dto.email,
            lat: 0,
            lng: 0,
          },
        });
        await tx.wallet.create({ data: { restaurantId: restaurant.id } });
      }

      return newUser;
    });

    const accessToken = this.generateToken(user.id, user.email, user.role as string);
    const profile = await this.buildUserProfile(user);

    return {
      accessToken,
      user: profile,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user.id, user.email, user.role as string);
    const profile = await this.buildUserProfile(user);

    return {
      accessToken,
      user: profile,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  private async buildUserProfile(user: { id: string; email: string; role: any }) {
    const profile: Record<string, any> = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    if (String(user.role) === Role.RESTAURANT) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId: user.id },
        select: { id: true, name: true },
      });
      if (restaurant) {
        profile.restaurantId = restaurant.id;
        profile.name = restaurant.name;
      }
    }

    return profile;
  }

  generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
