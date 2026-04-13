import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CartService } from '../cart/cart.service';
import { OrderStateService } from './order-state.service';
import { OmiseClient } from '@kin-delivery/omise-client';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@kin-delivery/database';
import { Role, CreateOrder } from '@kin-delivery/contracts';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class OrdersService {
  private readonly omiseClient = new OmiseClient();
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly cartService: CartService,
    private readonly orderStateService: OrderStateService,
  ) {}

  async createOrder(userId: string, dto: CreateOrder & { cardToken?: string }): Promise<any> {
    const {
      restaurantId,
      items,
      tier,
      paymentMethod,
      deliveryLat,
      deliveryLng,
      deliveryAddress,
      deliveryNote,
      cardToken,
    } = dto;

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    if (!restaurant.isOpen) throw new BadRequestException('Restaurant is currently closed');

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, category: { restaurantId } },
      include: { category: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException(
        'One or more menu items not found or do not belong to this restaurant',
      );
    }

    const unavailable = menuItems.filter((m) => !m.isAvailable);
    if (unavailable.length > 0) {
      throw new BadRequestException(
        `Items currently unavailable: ${unavailable.map((m) => m.name).join(', ')}`,
      );
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
    let subtotal = 0;

    const cartItemsForValidation = items.map((item) => {
      const mi = menuItemMap.get(item.menuItemId)!;
      const price = Number(mi.price);
      subtotal += price * item.quantity;
      return { menuItemId: item.menuItemId, restaurantId, price, quantity: item.quantity };
    });

    const validation = await this.cartService.validateCart(
      cartItemsForValidation,
      deliveryLat,
      deliveryLng,
      tier,
      userId,
    );

    if (!validation.valid) {
      throw new BadRequestException((validation as any).errors.join('; '));
    }

    const { deliveryFee, surgeMultiplier } = validation as any;
    const total = subtotal + deliveryFee;

    const order = await this.prisma.order.create({
      data: {
        customerId: userId,
        restaurantId,
        tier,
        paymentMethod,
        subtotal,
        deliveryFee,
        surgeMultiplier,
        total,
        deliveryLat,
        deliveryLng,
        deliveryAddress,
        deliveryNote,
        items: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            restaurantId,
            quantity: item.quantity,
            price: Number(menuItemMap.get(item.menuItemId)!.price),
            notes: item.notes,
          })),
        },
      },
      include: { items: { include: { menuItem: true } }, restaurant: true },
    });

    let paymentDetails: Record<string, any> = {};

    if (paymentMethod === PaymentMethod.WALLET) {
      const customerWallet = await this.walletService.getOrCreateWallet(userId, 'customer');
      await this.walletService.debit(
        customerWallet.id,
        total,
        order.id,
        `Payment for order ${order.id}`,
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.SUCCESS },
      });
      await this.orderStateService.transition(order.id, OrderStatus.CONFIRMED, {
        userId,
        role: 'SYSTEM',
      });
      paymentDetails = { paymentMethod: 'WALLET', message: 'Payment deducted from Kin Wallet' };
    } else if (paymentMethod === PaymentMethod.CARD) {
      if (!cardToken) throw new BadRequestException('cardToken is required for CARD payment');
      const charge = await this.omiseClient.createCardCharge(total, cardToken, order.id);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { chargeId: charge.id },
      });
      if (charge.status === 'successful') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.SUCCESS },
        });
        await this.orderStateService.transition(order.id, OrderStatus.CONFIRMED, {
          userId,
          role: 'SYSTEM',
        });
      }
      paymentDetails = {
        paymentMethod: 'CARD',
        chargeId: charge.id,
        chargeStatus: charge.status,
      };
    } else if (
      paymentMethod === PaymentMethod.PROMPTPAY ||
      paymentMethod === PaymentMethod.APP_QR
    ) {
      const result = await this.omiseClient.createPromptPayCharge(total, order.id);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { chargeId: result.chargeId },
      });
      paymentDetails = {
        paymentMethod,
        chargeId: result.chargeId,
        qrCodeUri: result.qrCodeUri,
        expiresAt: result.expiresAt,
        message: 'Scan QR code to complete payment',
      };
    } else if (paymentMethod === PaymentMethod.COD) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.SUCCESS },
      });
      await this.orderStateService.transition(order.id, OrderStatus.CONFIRMED, {
        userId,
        role: 'SYSTEM',
      });
      paymentDetails = { paymentMethod: 'COD', message: 'Pay upon delivery' };
    }

    const finalOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { menuItem: true } }, restaurant: true },
    });

    return { order: finalOrder, payment: paymentDetails };
  }

  async getOrder(orderId: string, user: JwtPayload): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        driver: true,
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const isParticipant = await this.isParticipant(order, user);
    if (!isParticipant) throw new ForbiddenException('You are not a participant of this order');

    return order;
  }

  async listOrders(user: JwtPayload, page: number, pageSize: number): Promise<any> {
    const skip = (page - 1) * pageSize;
    let where: any = {};

    if (user.role === Role.CUSTOMER) {
      where = { customerId: user.sub };
    } else if (user.role === Role.DRIVER) {
      where = { driverId: user.sub };
    } else if (user.role === Role.RESTAURANT) {
      const restaurant = await this.prisma.restaurant.findFirst({ where: { userId: user.sub } });
      if (!restaurant) return { data: [], total: 0, page, pageSize, totalPages: 0 };
      where = { restaurantId: restaurant.id };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { items: { include: { menuItem: true } }, restaurant: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async cancelOrder(orderId: string, userId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.customerId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel order with status '${order.status}'. Only PENDING or CONFIRMED orders can be cancelled.`,
      );
    }

    return this.orderStateService.transition(orderId, OrderStatus.CANCELLED, {
      userId,
      role: Role.CUSTOMER,
    });
  }

  private async isParticipant(order: any, user: JwtPayload): Promise<boolean> {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.CUSTOMER) return order.customerId === user.sub;
    if (user.role === Role.DRIVER) return order.driverId === user.sub;
    if (user.role === Role.RESTAURANT) {
      const restaurant = await this.prisma.restaurant.findFirst({ where: { userId: user.sub } });
      return !!restaurant && order.restaurantId === restaurant.id;
    }
    return false;
  }
}
