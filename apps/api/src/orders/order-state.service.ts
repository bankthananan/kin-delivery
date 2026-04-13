import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from '@kin-delivery/database';
import { Role } from '@kin-delivery/contracts';

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
};

// Which roles can trigger each transition (from_to → allowedRoles)
const TRANSITION_ROLE_MAP: Record<string, string[]> = {
  [`${OrderStatus.PENDING}_${OrderStatus.CONFIRMED}`]: ['SYSTEM'],
  [`${OrderStatus.PENDING}_${OrderStatus.CANCELLED}`]: [Role.CUSTOMER, 'SYSTEM'],
  [`${OrderStatus.CONFIRMED}_${OrderStatus.PREPARING}`]: [Role.RESTAURANT],
  [`${OrderStatus.CONFIRMED}_${OrderStatus.CANCELLED}`]: [Role.CUSTOMER, Role.RESTAURANT, 'SYSTEM'],
  [`${OrderStatus.PREPARING}_${OrderStatus.READY}`]: [Role.RESTAURANT],
  [`${OrderStatus.READY}_${OrderStatus.PICKED_UP}`]: [Role.DRIVER],
  [`${OrderStatus.PICKED_UP}_${OrderStatus.IN_TRANSIT}`]: [Role.DRIVER],
  [`${OrderStatus.IN_TRANSIT}_${OrderStatus.DELIVERED}`]: [Role.DRIVER],
  [`${OrderStatus.IN_TRANSIT}_${OrderStatus.FAILED}`]: ['SYSTEM'],
};

const COMMISSION_PCT = 0.15;

@Injectable()
export class OrderStateService {
  private readonly logger = new Logger(OrderStateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async transition(
    orderId: string,
    newStatus: OrderStatus,
    triggeredBy: { userId: string; role: string },
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { include: { wallet: true } },
        driver: { include: { wallet: true } },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const allowedNext = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${order.status} → ${newStatus}. ` +
          `Allowed next states: ${allowedNext.join(', ') || 'none (terminal state)'}`,
      );
    }

    const transitionKey = `${order.status}_${newStatus}`;
    const allowedRoles = TRANSITION_ROLE_MAP[transitionKey] ?? [];
    if (!allowedRoles.includes(triggeredBy.role)) {
      throw new ForbiddenException(
        `Role '${triggeredBy.role}' cannot transition an order from ${order.status} to ${newStatus}`,
      );
    }

    if (triggeredBy.role !== 'SYSTEM') {
      await this.validateOwnership(order as any, newStatus, triggeredBy);
    }

    await this.applySideEffects(order as any, newStatus, triggeredBy);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        driver: true,
      },
    });

    this.logger.log(
      `Order ${orderId}: ${order.status} → ${newStatus} [triggered by ${triggeredBy.role}:${triggeredBy.userId}]`,
    );

    return updated;
  }

  private async validateOwnership(
    order: any,
    newStatus: OrderStatus,
    triggeredBy: { userId: string; role: string },
  ): Promise<void> {
    const { userId, role } = triggeredBy;

    if (role === Role.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new ForbiddenException('This order does not belong to you');
      }
    }

    if (role === Role.DRIVER) {
      if (order.driverId !== userId) {
        throw new ForbiddenException('You are not the assigned driver for this order');
      }
    }

    if (role === Role.RESTAURANT) {
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: order.restaurantId, userId },
      });
      if (!restaurant) {
        throw new ForbiddenException('This order does not belong to your restaurant');
      }
    }
  }

  private async applySideEffects(
    order: any,
    newStatus: OrderStatus,
    triggeredBy: { userId: string; role: string },
  ): Promise<void> {
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        // TODO: Task 10 — schedule 5-min confirmation timeout via BullMQ
        this.logger.log(`[TODO: BullMQ] Schedule 5-min timeout for order ${order.id}`);
        break;

      case OrderStatus.PREPARING:
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        // TODO: Task 10 — cancel 5-min timeout job
        // TODO: Task 10 — start driver dispatch via BullMQ
        this.logger.log(`[TODO: BullMQ] Cancel timeout + start dispatch for order ${order.id}`);
        break;

      case OrderStatus.READY:
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        break;

      case OrderStatus.PICKED_UP:
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        break;

      case OrderStatus.CANCELLED:
        await this.handleCancellationRefund(order);
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        break;

      case OrderStatus.DELIVERED:
        await this.handleDeliveryCommission(order);
        await this.notificationsService.notifyOrderStatus(order.id, newStatus);
        break;

      default:
        break;
    }
  }

  private async handleCancellationRefund(order: any): Promise<void> {
    if (
      order.paymentStatus !== PaymentStatus.SUCCESS ||
      order.paymentMethod === PaymentMethod.COD
    ) {
      return;
    }

    const customerWallet = await this.walletService.getOrCreateWallet(order.customerId, 'customer');

    await this.walletService.credit(
      customerWallet.id,
      Number(order.total),
      TransactionType.REFUND,
      order.id,
      `Refund for cancelled order ${order.id}`,
    );

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    this.logger.log(`Refunded ฿${order.total} to customer ${order.customerId} for cancelled order ${order.id}`);
  }

  private async handleDeliveryCommission(order: any): Promise<void> {
    const restaurantWallet = order.restaurant?.wallet;
    const driverWallet = order.driver?.wallet;

    if (restaurantWallet && driverWallet) {
      await this.walletService.splitCommission(
        order.id,
        Number(order.subtotal),
        Number(order.deliveryFee),
        COMMISSION_PCT,
        restaurantWallet.id,
        driverWallet.id,
        `Platform commission (${COMMISSION_PCT * 100}%) for order ${order.id}`,
      );
    } else if (restaurantWallet) {
      const restaurantEarning = Number(order.subtotal) * (1 - COMMISSION_PCT);
      await this.walletService.credit(
        restaurantWallet.id,
        restaurantEarning,
        TransactionType.EARNING,
        order.id,
        `Earning from delivered order ${order.id} (no driver assigned)`,
      );
      this.logger.warn(`Driver wallet missing for delivered order ${order.id} — credited restaurant only`);
    } else {
      this.logger.warn(`No wallets found for commission split on order ${order.id}`);
    }
  }
}
