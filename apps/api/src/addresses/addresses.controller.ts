import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateAddress,
  CreateAddressSchema,
  NearestAddress,
  NearestAddressSchema,
  Role,
} from '@kin-delivery/contracts';

@Controller('customer/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  listAddresses(@CurrentUser() user: JwtPayload) {
    return this.addressesService.listAddresses(user.sub);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateAddressSchema))
  createAddress(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAddress,
  ) {
    return this.addressesService.createAddress(user.sub, dto);
  }

  @Delete(':id')
  deleteAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.deleteAddress(user.sub, addressId);
  }

  @Post('nearest')
  async nearestAddress(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(NearestAddressSchema)) dto: NearestAddress,
  ) {
    return this.addressesService.nearestAddress(user.sub, dto.lat, dto.lng);
  }
}
