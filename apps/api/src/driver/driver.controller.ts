import {
  Controller,
  Put,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@kin-delivery/contracts';

class UpdateStatusDto {
  isOnline: boolean;
  lat?: number;
  lng?: number;
}

class UpdateLocationDto {
  lat: number;
  lng: number;
}

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly dispatchService: DispatchService,
  ) {}

  @Put('status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStatusDto,
  ) {
    if (dto.isOnline) {
      if (dto.lat === undefined || dto.lng === undefined) {
        return { message: 'lat and lng are required when going online' };
      }
      await this.driverService.setOnline(user.sub, dto.lat, dto.lng);
      return { isOnline: true };
    }

    await this.driverService.setOffline(user.sub);
    return { isOnline: false };
  }

  @Put('location')
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateLocationDto,
  ) {
    await this.driverService.updateLocation(user.sub, dto.lat, dto.lng);
    return { updated: true };
  }

  @Post('orders/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
  ) {
    await this.dispatchService.acceptOrder(orderId, user.sub);
    return { accepted: true, orderId };
  }

  @Get('orders/active')
  async getActiveOrders(@CurrentUser() user: JwtPayload): Promise<any[]> {
    return this.driverService.getActiveOrders(user.sub);
  }
}
