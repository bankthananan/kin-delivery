import {
  Controller,
  Get,
  Post,
  Put,
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
import { OrdersService } from './orders.service';
import { OrderStateService } from './order-state.service';
import { Role, OrderTier, PaymentMethod } from '@kin-delivery/contracts';
import { OrderStatus } from '@kin-delivery/database';

class CreateOrderDto {
  restaurantId: string;
  items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  tier: OrderTier;
  paymentMethod: PaymentMethod;
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  deliveryNote?: string;
  cardToken?: string;
}

class UpdateOrderStatusDto {
  status: OrderStatus;
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderStateService: OrderStateService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CUSTOMER)
  async createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto): Promise<any> {
    return this.ordersService.createOrder(user.sub, dto);
  }

  @Get()
  async listOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<any> {
    return this.ordersService.listOrders(user, page, pageSize);
  }

  @Get(':id')
  async getOrder(@CurrentUser() user: JwtPayload, @Param('id') orderId: string): Promise<any> {
    return this.ordersService.getOrder(orderId, user);
  }

  @Put(':id/status')
  @Roles(Role.RESTAURANT, Role.DRIVER)
  async updateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<any> {
    return this.orderStateService.transition(orderId, dto.status, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CUSTOMER)
  async cancelOrder(@CurrentUser() user: JwtPayload, @Param('id') orderId: string): Promise<any> {
    return this.ordersService.cancelOrder(orderId, user.sub);
  }
}
