import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { ORDER_TIMEOUT_QUEUE } from './dispatch.module';
import { OrderStatus, TransactionType } from '@kin-delivery/database';

@Processor(ORDER_TIMEOUT_QUEUE)
export class TimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(TimeoutProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ orderId: string }>): Promise<void> {
    const { orderId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { wallet: true } } },
    });

    if (!order || order.status !== OrderStatus.CONFIRMED) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      const wallet = order.customer.wallet;
      if (wallet) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: order.total,
            type: TransactionType.REFUND,
            referenceId: orderId,
            description: `Refund for cancelled order ${orderId} (restaurant timeout)`,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: order.total } },
        });
      }
    });

    this.logger.log(`Order ${orderId} auto-cancelled (restaurant timeout) — customer refunded`);
  }
}
