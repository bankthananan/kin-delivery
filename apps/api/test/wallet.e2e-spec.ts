import { INestApplication, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { WalletController } from '../src/wallet/wallet.controller';
import { WalletService } from '../src/wallet/wallet.service';

const WALLET_ID = 'wallet_001';

const mockTransaction = {
  id: 'txn_001',
  walletId: WALLET_ID,
  amount: 500,
  type: 'TOPUP',
  createdAt: new Date(),
};

function buildMockWalletService(balanceValue = 1000) {
  const mockBalance = {
    toNumber: () => balanceValue,
    lessThan: (n: number) => balanceValue < n,
    toString: () => String(balanceValue),
  };

  return {
    getBalance: jest.fn().mockResolvedValue(mockBalance),
    getTransactions: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }),
    topup: jest.fn().mockResolvedValue(mockTransaction),
    debit: jest.fn().mockResolvedValue(mockTransaction),
    withdraw: jest.fn().mockResolvedValue({ ...mockTransaction, type: 'PAYOUT' }),
    getOrCreateWallet: jest.fn().mockResolvedValue({ id: WALLET_ID }),
    credit: jest.fn().mockResolvedValue(mockTransaction),
  };
}

jest.mock('@kin-delivery/omise-client', () => ({
  OmiseClient: jest.fn().mockImplementation(() => ({
    createPromptPayCharge: jest.fn().mockResolvedValue({
      chargeId: 'chrg_test_001',
      qrCodeUri: 'https://example.com/qr.png',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    createCardCharge: jest.fn().mockResolvedValue({
      id: 'chrg_card_001',
      status: 'successful',
    }),
  })),
  PromptPayService: jest.fn().mockImplementation(() => ({})),
}));

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let mockWalletService: ReturnType<typeof buildMockWalletService>;

  beforeEach(async () => {
    mockWalletService = buildMockWalletService(1000);

    const module = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /wallet/balance', () => {
    it('returns current balance for walletId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/balance?walletId=${WALLET_ID}`)
        .expect(200);

      expect(res.body.walletId).toBe(WALLET_ID);
      expect(mockWalletService.getBalance).toHaveBeenCalledWith(WALLET_ID);
    });

    it('wallet not found → 404', async () => {
      mockWalletService.getBalance.mockRejectedValueOnce(
        new NotFoundException('Wallet not found'),
      );

      await request(app.getHttpServer())
        .get('/wallet/balance?walletId=nonexistent')
        .expect(404);
    });
  });

  describe('GET /wallet/transactions', () => {
    it('returns paginated transactions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallet/transactions?walletId=${WALLET_ID}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(mockWalletService.getTransactions).toHaveBeenCalledWith(WALLET_ID, 1, 20);
    });
  });

  describe('POST /wallet/topup', () => {
    it('PROMPTPAY topup → 201 with QR code URI', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/topup')
        .send({ walletId: WALLET_ID, amount: 500, paymentMethod: 'PROMPTPAY' })
        .expect(201);

      expect(res.body.chargeId).toBe('chrg_test_001');
      expect(res.body.qrCodeUri).toBeDefined();
      expect(res.body.message).toContain('QR');
    });

    it('CARD topup with valid token → 201 with transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/topup')
        .send({ walletId: WALLET_ID, amount: 500, paymentMethod: 'CARD', cardToken: 'tok_test_001' })
        .expect(201);

      expect(res.body.chargeId).toBe('chrg_card_001');
      expect(res.body.transaction).toBeDefined();
      expect(mockWalletService.topup).toHaveBeenCalledWith(WALLET_ID, 500, 'chrg_card_001');
    });

    it('CARD topup without cardToken → 400', async () => {
      await request(app.getHttpServer())
        .post('/wallet/topup')
        .send({ walletId: WALLET_ID, amount: 500, paymentMethod: 'CARD' })
        .expect(400);
    });

    it('invalid paymentMethod → 400', async () => {
      await request(app.getHttpServer())
        .post('/wallet/topup')
        .send({ walletId: WALLET_ID, amount: 500, paymentMethod: 'BITCOIN' })
        .expect(400);
    });
  });

  describe('POST /wallet/withdraw', () => {
    it('valid withdrawal >= 100 THB → 201 with transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .send({ walletId: WALLET_ID, amount: 200, bankAccount: 'bank_acc_001' })
        .expect(201);

      expect(res.body.transaction).toBeDefined();
      expect(res.body.message).toContain('Withdrawal');
      expect(mockWalletService.withdraw).toHaveBeenCalledWith(WALLET_ID, 200);
    });

    it('withdrawal < 100 THB → 400', async () => {
      mockWalletService.withdraw.mockRejectedValueOnce(
        new BadRequestException('Minimum withdrawal amount is 100 THB'),
      );

      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .send({ walletId: WALLET_ID, amount: 50, bankAccount: 'bank_acc_001' })
        .expect(400);
    });

    it('withdrawal with insufficient balance → 400', async () => {
      mockWalletService.withdraw.mockRejectedValueOnce(
        new BadRequestException('Insufficient wallet balance'),
      );

      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .send({ walletId: WALLET_ID, amount: 99999, bankAccount: 'bank_acc_001' })
        .expect(400);
    });

    it('wallet not found → 404', async () => {
      mockWalletService.withdraw.mockRejectedValueOnce(
        new NotFoundException('Wallet not found'),
      );

      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .send({ walletId: 'nonexistent', amount: 200, bankAccount: 'bank_acc_001' })
        .expect(404);
    });
  });
});
