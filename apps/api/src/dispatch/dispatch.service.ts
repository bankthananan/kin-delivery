import { Injectable, ConflictException, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../geo/redis.provider';
import {
  ORDER_DISPATCH_QUEUE,
  ORDER_TIMEOUT_QUEUE,
} from './dispatch.module';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectQueue(ORDER_DISPATCH_QUEUE) private readonly dispatchQueue: Queue,
    @InjectQueue(ORDER_TIMEOUT_QUEUE) private readonly timeoutQueue: Queue,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async dispatchOrder(orderId: string): Promise<void> {
    await this.dispatchQueue.add(
      'dispatch',
      { orderId },
      {
        jobId: `dispatch:${orderId}`,
        attempts: 3,
        backoff: { type: 'fixed', delay: 30_000 },
      },
    );
    this.logger.log(`Dispatch job queued for order ${orderId}`);
  }

  async scheduleRestaurantTimeout(orderId: string, delayMs: number): Promise<void> {
    await this.timeoutQueue.add(
      'timeout',
      { orderId },
      {
        jobId: `timeout:${orderId}`,
        delay: delayMs,
      },
    );
    this.logger.log(`Timeout scheduled for order ${orderId} in ${delayMs}ms`);
  }

  async cancelTimeout(orderId: string): Promise<void> {
    const job = await this.timeoutQueue.getJob(`timeout:${orderId}`);
    if (job) {
      await job.remove();
      this.logger.log(`Timeout cancelled for order ${orderId}`);
    }
  }

  async acceptOrder(orderId: string, driverId: string): Promise<void> {
    const lockKey = `order:${orderId}:driver`;
    const acquired = await this.redis.set(lockKey, driverId, 'EX', 86400, 'NX');

    if (!acquired) {
      throw new ConflictException('Order already accepted by another driver');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId },
    });

    this.logger.log(`Order ${orderId} accepted by driver ${driverId}`);
  }
}
