import { Injectable, Logger } from '@nestjs/common';
import {
  TransactionType,
  PaymentStatus,
  OrderStatus,
} from '@kin-delivery/database';
import { OmiseClient, PromptPayChargeResult, OmiseChargeResponse } from '@kin-delivery/omise-client';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly omiseClient = new OmiseClient();
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async processChargeComplete(chargeId: string, omiseEventId: string): Promise<void> {
    const existing = await this.prisma.transaction.findFirst({
      where: { externalRefId: chargeId },
    });

    if (existing) {
      this.logger.log(`Charge ${chargeId} already processed — skipping`);
      return;
    }

    const charge = await this.omiseClient['client']?.charges?.retrieve(chargeId).catch(() => null);
    if (!charge) {
      this.logger.warn(`Could not retrieve charge ${chargeId} from Omise`);
      return;
    }

    const orderId = charge.metadata?.orderId as string | undefined;
    if (!orderId) {
      this.logger.warn(`Charge ${chargeId} has no orderId in metadata`);
      return;
    }

    if (charge.status === 'successful') {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.SUCCESS, chargeId },
        });

        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) return;

        const restaurant = await tx.restaurant.findUnique({
          where: { id: order.restaurantId },
          include: { wallet: true },
        });
        const driver = order.driverId
          ? await tx.driver.findUnique({
              where: { id: order.driverId },
              include: { wallet: true },
            })
          : null;

        const commissionPct = 0.15;

        if (restaurant?.wallet) {
          await tx.transaction.create({
            data: {
              walletId: restaurant.wallet.id,
              amount: Number(order.subtotal) * (1 - commissionPct),
              type: TransactionType.EARNING,
              referenceId: orderId,
              externalRefId: chargeId,
              description: `Earning from order ${orderId}`,
            },
          });
          await tx.wallet.update({
            where: { id: restaurant.wallet.id },
            data: { balance: { increment: Number(order.subtotal) * (1 - commissionPct) } },
          });
        }

        if (driver?.wallet) {
          await tx.transaction.create({
            data: {
              walletId: driver.wallet.id,
              amount: Number(order.deliveryFee) * (1 - commissionPct),
              type: TransactionType.EARNING,
              referenceId: orderId,
              externalRefId: `${chargeId}-driver`,
              description: `Delivery earning for order ${orderId}`,
            },
          });
          await tx.wallet.update({
            where: { id: driver.wallet.id },
            data: { balance: { increment: Number(order.deliveryFee) * (1 - commissionPct) } },
          });
        }
      });

      this.logger.log(`Charge ${chargeId} processed successfully for order ${orderId}`);
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      this.logger.log(`Charge ${chargeId} failed for order ${orderId}`);
    }
  }

  async initiatePromptPayPayment(
    orderId: string,
    amount: number,
  ): Promise<PromptPayChargeResult> {
    return this.omiseClient.createPromptPayCharge(amount, orderId);
  }

  async initiateCardPayment(
    orderId: string,
    amount: number,
    cardToken: string,
  ): Promise<OmiseChargeResponse> {
    return this.omiseClient.createCardCharge(amount, cardToken, orderId);
  }
}
