import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { INTRANSIT_MONITOR_QUEUE } from './dispatch.module';
import { OrderStatus, TransactionType } from '@kin-delivery/database';

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

@Processor(INTRANSIT_MONITOR_QUEUE)
export class IntransitMonitorProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(IntransitMonitorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(INTRANSIT_MONITOR_QUEUE) private readonly monitorQueue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.monitorQueue.add(
      'scan',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: 'intransit-monitor-repeatable',
      },
    );
  }

  async process(job: Job): Promise<void> {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);

    const staleOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.IN_TRANSIT,
        updatedAt: { lt: threshold },
      },
      include: {
        customer: { include: { wallet: true } },
        driver: true,
      },
    });

    this.logger.log(`In-transit monitor: found ${staleOrders.length} stale orders`);

    for (const order of staleOrders) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FAILED },
        });

        const wallet = order.customer.wallet;
        if (wallet) {
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: order.total,
              type: TransactionType.REFUND,
              referenceId: order.id,
              description: `Refund for failed delivery ${order.id} (2hr in-transit timeout)`,
            },
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: order.total } },
          });
        }

        if (order.driver) {
          await tx.driver.update({
            where: { id: order.driver.id },
            data: { isOnline: false },
          });
        }
      });

      this.logger.warn(`Order ${order.id} marked FAILED — driver ${order.driverId} flagged offline`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Monitor job ${job.id} failed: ${error.message}`);
  }
}
