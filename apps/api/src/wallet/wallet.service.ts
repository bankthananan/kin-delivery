import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType, Wallet, Transaction } from '@kin-delivery/database';
import { PrismaService } from '../database/prisma.service';
type Decimal = { lessThan(n: number): boolean; toString(): string };

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(
    userId: string,
    ownerType: 'customer' | 'driver' | 'restaurant',
  ): Promise<Wallet> {
    const whereClause =
      ownerType === 'customer'
        ? { customerId: userId }
        : ownerType === 'driver'
          ? { driverId: userId }
          : { restaurantId: userId };

    const existing = await this.prisma.wallet.findFirst({ where: whereClause });
    if (existing) return existing;

    const createData =
      ownerType === 'customer'
        ? { customerId: userId }
        : ownerType === 'driver'
          ? { driverId: userId }
          : { restaurantId: userId };

    return this.prisma.wallet.create({ data: createData });
  }

  async getBalance(walletId: string): Promise<Decimal> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet.balance;
  }

  async getTransactions(
    walletId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: Transaction[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where: { walletId } }),
    ]);
    return { data, total, page, pageSize };
  }

  async topup(walletId: string, amount: number, chargeId: string): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const transaction = await tx.transaction.create({
        data: {
          walletId,
          amount,
          type: TransactionType.TOPUP,
          externalRefId: chargeId,
          description: `Top up ${amount} THB`,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });

      return transaction;
    });
  }

  async debit(
    walletId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (wallet.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId,
          amount,
          type: TransactionType.PAYMENT,
          referenceId,
          description,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      return transaction;
    });
  }

  async credit(
    walletId: string,
    amount: number,
    type: TransactionType,
    referenceId: string,
    description: string,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const transaction = await tx.transaction.create({
        data: {
          walletId,
          amount,
          type,
          referenceId,
          description,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });

      return transaction;
    });
  }

  async withdraw(walletId: string, amount: number): Promise<Transaction> {
    if (amount < 100) {
      throw new BadRequestException('Minimum withdrawal amount is 100 THB');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (wallet.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId,
          amount,
          type: TransactionType.PAYOUT,
          description: `Withdrawal ${amount} THB`,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      return transaction;
    });
  }

  async splitCommission(
    orderId: string,
    subtotal: number,
    deliveryFee: number,
    commissionPct: number,
    restaurantWalletId: string,
    driverWalletId: string,
    platformDescription: string,
  ): Promise<{ restaurantTransaction: Transaction; driverTransaction: Transaction }> {
    const restaurantEarning = subtotal * (1 - commissionPct);
    const driverEarning = deliveryFee * (1 - commissionPct);

    return this.prisma.$transaction(async (tx) => {
      const [restaurantWallet, driverWallet] = await Promise.all([
        tx.wallet.findUnique({ where: { id: restaurantWalletId } }),
        tx.wallet.findUnique({ where: { id: driverWalletId } }),
      ]);

      if (!restaurantWallet) throw new NotFoundException('Restaurant wallet not found');
      if (!driverWallet) throw new NotFoundException('Driver wallet not found');

      const [restaurantTransaction, driverTransaction] = await Promise.all([
        tx.transaction.create({
          data: {
            walletId: restaurantWalletId,
            amount: restaurantEarning,
            type: TransactionType.EARNING,
            referenceId: orderId,
            description: platformDescription,
          },
        }),
        tx.transaction.create({
          data: {
            walletId: driverWalletId,
            amount: driverEarning,
            type: TransactionType.EARNING,
            referenceId: orderId,
            description: `Delivery fee earning for order ${orderId}`,
          },
        }),
      ]);

      await Promise.all([
        tx.wallet.update({
          where: { id: restaurantWalletId },
          data: { balance: { increment: restaurantEarning } },
        }),
        tx.wallet.update({
          where: { id: driverWalletId },
          data: { balance: { increment: driverEarning } },
        }),
      ]);

      return { restaurantTransaction, driverTransaction };
    });
  }
}
