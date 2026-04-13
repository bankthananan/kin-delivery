import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus, Role } from '@kin-delivery/database';

interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Enqueue a push notification job
   */
  async sendPush(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    try {
      await this.notificationsQueue.add(
        'send-push',
        { userId, title, body, data } as PushJobData,
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
      this.logger.debug(`Push notification enqueued for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue push notification for user ${userId}:`, error);
    }
  }

  /**
   * Notify relevant parties based on order status change
   */
  async notifyOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, driver: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for notification`);
      return;
    }

    const restaurantUser = await this.prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { userId: true, name: true },
    });

    switch (status) {
      case OrderStatus.CONFIRMED:
        // Notify restaurant: "New order received"
        if (restaurantUser?.userId) {
          await this.sendPush(
            restaurantUser.userId,
            'New Order Received',
            `Order #${order.id} from customer. Total: ฿${order.total}`,
            { orderId, orderStatus: status },
          );
        }
        break;

      case OrderStatus.PREPARING:
        // Notify customer: "Restaurant is preparing your order"
        if (order.customerId) {
          await this.sendPush(
            order.customerId,
            'Order Preparing',
            `Restaurant is preparing your order #${order.id}`,
            { orderId, orderStatus: status },
          );
        }
        break;

      case OrderStatus.READY:
        // Notify driver: "Order ready for pickup"
        if (order.driverId) {
          await this.sendPush(
            order.driverId,
            'Order Ready',
            `Order #${order.id} is ready for pickup at ${restaurantUser?.name}`,
            { orderId, orderStatus: status },
          );
        }
        break;

      case OrderStatus.PICKED_UP:
        // Notify customer: "Driver picked up your order"
        if (order.customerId) {
          await this.sendPush(
            order.customerId,
            'Order Picked Up',
            `Driver picked up your order #${order.id}. On the way!`,
            { orderId, orderStatus: status },
          );
        }
        break;

      case OrderStatus.DELIVERED:
        // Notify customer: "Order delivered! Rate your experience"
        if (order.customerId) {
          await this.sendPush(
            order.customerId,
            'Order Delivered',
            `Your order #${order.id} has been delivered! Rate your experience.`,
            { orderId, orderStatus: status },
          );
        }
        break;

      case OrderStatus.CANCELLED:
        // Notify customer: "Order cancelled. Refund issued to Kin Wallet"
        if (order.customerId) {
          await this.sendPush(
            order.customerId,
            'Order Cancelled',
            `Order #${order.id} has been cancelled. Refund issued to Kin Wallet.`,
            { orderId, orderStatus: status },
          );
        }
        break;

      default:
        break;
    }
  }
}
