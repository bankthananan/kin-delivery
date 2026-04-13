import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@kin-delivery/database';

jest.mock('@kin-delivery/database', () => {
  const mockTx = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockInstance = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
    _mockTx: mockTx,
  };

  return {
    PrismaClient: jest.fn(() => mockInstance),
    TransactionType: {
      TOPUP: 'TOPUP',
      PAYMENT: 'PAYMENT',
      PAYOUT: 'PAYOUT',
      REFUND: 'REFUND',
      EARNING: 'EARNING',
    },
  };
});

import { WalletService } from '../wallet.service';
import { PrismaClient } from '@kin-delivery/database';

function makeDecimal(value: number) {
  return {
    lessThan: (n: number) => value < n,
    toString: () => String(value),
  };
}

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WalletService();
    prisma = (service as any).prisma;
    tx = prisma._mockTx;
  });

  describe('getOrCreateWallet', () => {
    it('returns existing wallet when found', async () => {
      const existing = { id: 'wallet-1', customerId: 'c1' };
      prisma.wallet.findFirst.mockResolvedValue(existing);

      const result = await service.getOrCreateWallet('c1', 'customer');
      expect(result).toBe(existing);
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it('creates wallet when none exists', async () => {
      const created = { id: 'wallet-new', customerId: 'c2' };
      prisma.wallet.findFirst.mockResolvedValue(null);
      prisma.wallet.create.mockResolvedValue(created);

      const result = await service.getOrCreateWallet('c2', 'customer');
      expect(result).toBe(created);
      expect(prisma.wallet.create).toHaveBeenCalledWith({ data: { customerId: 'c2' } });
    });
  });

  describe('topup', () => {
    it('creates TOPUP transaction and increments wallet balance', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(100) };
      const createdTx = { id: 'tx-1', type: TransactionType.TOPUP, amount: 50 };
      tx.wallet.findUnique.mockResolvedValue(wallet);
      tx.transaction.create.mockResolvedValue(createdTx);
      tx.wallet.update.mockResolvedValue({});

      const result = await service.topup('wallet-1', 50, 'charge-abc');

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          amount: 50,
          type: TransactionType.TOPUP,
          externalRefId: 'charge-abc',
        }),
      });
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 50 } },
      });
      expect(result).toBe(createdTx);
    });

    it('throws NotFoundException when wallet not found', async () => {
      tx.wallet.findUnique.mockResolvedValue(null);
      await expect(service.topup('bad-wallet', 50, 'charge-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('debit', () => {
    it('creates PAYMENT transaction and decrements balance when funds sufficient', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(200) };
      const createdTx = { id: 'tx-2', type: TransactionType.PAYMENT, amount: 80 };
      tx.wallet.findUnique.mockResolvedValue(wallet);
      tx.transaction.create.mockResolvedValue(createdTx);
      tx.wallet.update.mockResolvedValue({});

      const result = await service.debit('wallet-1', 80, 'order-1', 'Payment for order');

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          amount: 80,
          type: TransactionType.PAYMENT,
          referenceId: 'order-1',
        }),
      });
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 80 } },
      });
      expect(result).toBe(createdTx);
    });

    it('throws BadRequestException when balance is insufficient', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(50) };
      tx.wallet.findUnique.mockResolvedValue(wallet);

      await expect(service.debit('wallet-1', 100, 'order-1', 'Payment')).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when wallet not found', async () => {
      tx.wallet.findUnique.mockResolvedValue(null);
      await expect(service.debit('bad-wallet', 10, 'order-1', 'Payment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('withdraw', () => {
    it('throws BadRequestException for amounts below 100 THB', async () => {
      await expect(service.withdraw('wallet-1', 99)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for exactly 99 THB', async () => {
      await expect(service.withdraw('wallet-1', 99)).rejects.toThrow('Minimum withdrawal amount is 100 THB');
    });

    it('creates PAYOUT transaction for valid withdrawal amount', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(500) };
      const createdTx = { id: 'tx-3', type: TransactionType.PAYOUT, amount: 200 };
      tx.wallet.findUnique.mockResolvedValue(wallet);
      tx.transaction.create.mockResolvedValue(createdTx);
      tx.wallet.update.mockResolvedValue({});

      const result = await service.withdraw('wallet-1', 200);

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          amount: 200,
          type: TransactionType.PAYOUT,
        }),
      });
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 200 } },
      });
      expect(result).toBe(createdTx);
    });

    it('allows exactly 100 THB withdrawal (boundary)', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(100) };
      tx.wallet.findUnique.mockResolvedValue(wallet);
      tx.transaction.create.mockResolvedValue({ id: 'tx-4', type: TransactionType.PAYOUT, amount: 100 });
      tx.wallet.update.mockResolvedValue({});

      await expect(service.withdraw('wallet-1', 100)).resolves.toBeDefined();
    });

    it('throws BadRequestException when balance insufficient for withdrawal', async () => {
      const wallet = { id: 'wallet-1', balance: makeDecimal(50) };
      tx.wallet.findUnique.mockResolvedValue(wallet);

      await expect(service.withdraw('wallet-1', 200)).rejects.toThrow(BadRequestException);
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('splitCommission', () => {
    it('creates EARNING transactions for both restaurant and driver', async () => {
      const restaurantWallet = { id: 'rest-wallet', balance: makeDecimal(0) };
      const driverWallet = { id: 'driver-wallet', balance: makeDecimal(0) };
      const restTx = { id: 'tx-rest', type: TransactionType.EARNING, amount: 68 };
      const driverTx = { id: 'tx-driver', type: TransactionType.EARNING, amount: 17 };

      tx.wallet.findUnique
        .mockResolvedValueOnce(restaurantWallet)
        .mockResolvedValueOnce(driverWallet);
      tx.transaction.create
        .mockResolvedValueOnce(restTx)
        .mockResolvedValueOnce(driverTx);
      tx.wallet.update.mockResolvedValue({});

      const result = await service.splitCommission(
        'order-1',
        80,
        20,
        0.15,
        'rest-wallet',
        'driver-wallet',
        'Platform commission',
      );

      expect(result.restaurantTransaction).toBe(restTx);
      expect(result.driverTransaction).toBe(driverTx);

      expect(tx.transaction.create).toHaveBeenCalledTimes(2);
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'rest-wallet',
          amount: 80 * (1 - 0.15),
          type: TransactionType.EARNING,
          referenceId: 'order-1',
        }),
      });
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'driver-wallet',
          amount: 20 * (1 - 0.15),
          type: TransactionType.EARNING,
          referenceId: 'order-1',
        }),
      });
    });

    it('throws NotFoundException when restaurant wallet missing', async () => {
      tx.wallet.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'driver-wallet' });

      await expect(
        service.splitCommission('order-1', 80, 20, 0.15, 'rest-wallet', 'driver-wallet', 'desc'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when driver wallet missing', async () => {
      tx.wallet.findUnique
        .mockResolvedValueOnce({ id: 'rest-wallet' })
        .mockResolvedValueOnce(null);

      await expect(
        service.splitCommission('order-1', 80, 20, 0.15, 'rest-wallet', 'driver-wallet', 'desc'),
      ).rejects.toThrow(NotFoundException);
    });

    it('calculates correct earnings: restaurant gets subtotal*(1-commission), driver gets deliveryFee*(1-commission)', async () => {
      const subtotal = 100;
      const deliveryFee = 40;
      const commissionPct = 0.15;

      tx.wallet.findUnique
        .mockResolvedValueOnce({ id: 'rest-wallet' })
        .mockResolvedValueOnce({ id: 'driver-wallet' });
      tx.transaction.create
        .mockResolvedValueOnce({ id: 'r-tx' })
        .mockResolvedValueOnce({ id: 'd-tx' });
      tx.wallet.update.mockResolvedValue({});

      await service.splitCommission('order-1', subtotal, deliveryFee, commissionPct, 'rest-wallet', 'driver-wallet', 'desc');

      const restEarning = subtotal * (1 - commissionPct);
      const driverEarning = deliveryFee * (1 - commissionPct);

      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'rest-wallet' },
        data: { balance: { increment: restEarning } },
      });
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'driver-wallet' },
        data: { balance: { increment: driverEarning } },
      });
    });
  });

  describe('credit', () => {
    it('creates transaction of given type and increments balance', async () => {
      const wallet = { id: 'wallet-1' };
      const createdTx = { id: 'tx-credit', type: TransactionType.REFUND };
      tx.wallet.findUnique.mockResolvedValue(wallet);
      tx.transaction.create.mockResolvedValue(createdTx);
      tx.wallet.update.mockResolvedValue({});

      const result = await service.credit('wallet-1', 50, TransactionType.REFUND, 'order-1', 'Refund');

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          amount: 50,
          type: TransactionType.REFUND,
          referenceId: 'order-1',
        }),
      });
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 50 } },
      });
      expect(result).toBe(createdTx);
    });
  });
});
