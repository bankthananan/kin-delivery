import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@kin-delivery/contracts';

class UpsertConfigDto {
  key: string;
  value: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(): Promise<any> {
    return this.adminService.getDashboard();
  }

  @Get('users')
  async listUsers(
    @Query('role') role?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ): Promise<any> {
    return this.adminService.listUsers(role, page, pageSize);
  }

  @Get('orders')
  async listOrders(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ): Promise<any> {
    return this.adminService.listOrders(status, page, pageSize);
  }

  @Get('restaurants')
  async listRestaurants(): Promise<any> {
    return this.adminService.listRestaurants();
  }

  @Get('drivers')
  async listDrivers(): Promise<any> {
    return this.adminService.listDrivers();
  }

  @Get('finances/summary')
  async getFinancesSummary(): Promise<any> {
    return this.adminService.getFinancesSummary();
  }

  @Get('finances/transactions')
  async listTransactions(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ): Promise<any> {
    return this.adminService.listTransactions(type, page, pageSize);
  }

  @Get('config')
  async getConfig(): Promise<any> {
    return this.adminService.getConfig();
  }

  @Put('config')
  async upsertConfig(@Body() dto: UpsertConfigDto): Promise<any> {
    return this.adminService.upsertConfig(dto.key, dto.value);
  }
}
