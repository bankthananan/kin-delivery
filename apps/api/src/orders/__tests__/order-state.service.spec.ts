import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStateService } from '../order-state.service';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { OrderStatus, PaymentMethod, PaymentStatus, TransactionType } from '@kin-delivery/database';
import { Role } from '@kin-delivery/contracts';

const SYSTEM = 'SYSTEM';

function makeOrder(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    restaurantId: 'restaurant-1',
    driverId: 'driver-1',
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.WALLET,
    total: 100,
    subtotal: 80,
    deliveryFee: 20,
    restaurant: { id: 'restaurant-1', wallet: { id: 'rest-wallet-1' } },
    driver: { id: 'driver-1', wallet: { id: 'driver-wallet-1' } },
    ...overrides,
  };
}

describe('OrderStateService', () => {
  let service: OrderStateService;
  let mockPrisma: {
    order: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    restaurant: { findFirst: jest.Mock };
  };
  let mockWalletService: {
    getOrCreateWallet: jest.Mock;
    credit: jest.Mock;
    splitCommission: jest.Mock;
  };
  let mockNotifications: { notifyOrderStatus: jest.Mock };
  let mockGateway: { emitOrderStatusUpdate: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.CONFIRMED }),
        count: jest.fn(),
      },
      restaurant: { findFirst: jest.fn() },
    };

    mockWalletService = {
      getOrCreateWallet: jest.fn().mockResolvedValue({ id: 'customer-wallet-1' }),
      credit: jest.fn().mockResolvedValue({}),
      splitCommission: jest.fn().mockResolvedValue({}),
    };

    mockNotifications = { notifyOrderStatus: jest.fn().mockResolvedValue(undefined) };
    mockGateway = { emitOrderStatusUpdate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: RealtimeGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<OrderStateService>(OrderStateService);
  });

  describe('valid transitions', () => {
    it('PENDING → CONFIRMED (SYSTEM)', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CONFIRMED });

      const result = await service.transition('order-1', OrderStatus.CONFIRMED, { userId: 'sys', role: SYSTEM });
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('CONFIRMED → PREPARING (RESTAURANT)', async () => {
      const order = makeOrder({ status: OrderStatus.CONFIRMED, restaurantId: 'restaurant-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.PREPARING });
      mockPrisma.restaurant.findFirst.mockResolvedValue({ id: 'restaurant-1', userId: 'rest-user-1' });

      const result = await service.transition('order-1', OrderStatus.PREPARING, { userId: 'rest-user-1', role: Role.RESTAURANT });
      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('CONFIRMED → CANCELLED (SYSTEM)', async () => {
      const order = makeOrder({ status: OrderStatus.CONFIRMED });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      const result = await service.transition('order-1', OrderStatus.CANCELLED, { userId: 'sys', role: SYSTEM });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('PREPARING → READY (RESTAURANT)', async () => {
      const order = makeOrder({ status: OrderStatus.PREPARING, restaurantId: 'restaurant-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.READY });
      mockPrisma.restaurant.findFirst.mockResolvedValue({ id: 'restaurant-1', userId: 'rest-user-1' });

      const result = await service.transition('order-1', OrderStatus.READY, { userId: 'rest-user-1', role: Role.RESTAURANT });
      expect(result.status).toBe(OrderStatus.READY);
    });

    it('READY → PICKED_UP (DRIVER)', async () => {
      const order = makeOrder({ status: OrderStatus.READY, driverId: 'driver-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.PICKED_UP });

      const result = await service.transition('order-1', OrderStatus.PICKED_UP, { userId: 'driver-1', role: Role.DRIVER });
      expect(result.status).toBe(OrderStatus.PICKED_UP);
    });

    it('PICKED_UP → IN_TRANSIT (DRIVER)', async () => {
      const order = makeOrder({ status: OrderStatus.PICKED_UP, driverId: 'driver-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.IN_TRANSIT });

      const result = await service.transition('order-1', OrderStatus.IN_TRANSIT, { userId: 'driver-1', role: Role.DRIVER });
      expect(result.status).toBe(OrderStatus.IN_TRANSIT);
    });

    it('IN_TRANSIT → DELIVERED (DRIVER)', async () => {
      const order = makeOrder({ status: OrderStatus.IN_TRANSIT, driverId: 'driver-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.DELIVERED });

      const result = await service.transition('order-1', OrderStatus.DELIVERED, { userId: 'driver-1', role: Role.DRIVER });
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: Array<[OrderStatus, OrderStatus]> = [
      [OrderStatus.PENDING, OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED, OrderStatus.PENDING],
      [OrderStatus.CANCELLED, OrderStatus.CONFIRMED],
      [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    ];

    test.each(invalidCases)(
      '%s → %s throws BadRequestException',
      async (from, to) => {
        mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ status: from }));
        await expect(
          service.transition('order-1', to, { userId: 'u1', role: SYSTEM }),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('role-based access control', () => {
    it('rejects CUSTOMER triggering PENDING → CONFIRMED (SYSTEM only)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.PENDING }));
      await expect(
        service.transition('order-1', OrderStatus.CONFIRMED, { userId: 'customer-1', role: Role.CUSTOMER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects DRIVER triggering CONFIRMED → PREPARING (RESTAURANT only)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.CONFIRMED }));
      await expect(
        service.transition('order-1', OrderStatus.PREPARING, { userId: 'driver-1', role: Role.DRIVER }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows CUSTOMER to cancel their own CONFIRMED order', async () => {
      const order = makeOrder({ status: OrderStatus.CONFIRMED, customerId: 'customer-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await expect(
        service.transition('order-1', OrderStatus.CANCELLED, { userId: 'customer-1', role: Role.CUSTOMER }),
      ).resolves.toBeDefined();
    });

    it('allows RESTAURANT to trigger CONFIRMED → PREPARING for their own order', async () => {
      const order = makeOrder({ status: OrderStatus.CONFIRMED, restaurantId: 'restaurant-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.PREPARING });
      mockPrisma.restaurant.findFirst.mockResolvedValue({ id: 'restaurant-1', userId: 'rest-user-1' });

      await expect(
        service.transition('order-1', OrderStatus.PREPARING, { userId: 'rest-user-1', role: Role.RESTAURANT }),
      ).resolves.toBeDefined();
    });

    it('allows DRIVER to pick up READY order assigned to them', async () => {
      const order = makeOrder({ status: OrderStatus.READY, driverId: 'driver-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.PICKED_UP });

      await expect(
        service.transition('order-1', OrderStatus.PICKED_UP, { userId: 'driver-1', role: Role.DRIVER }),
      ).resolves.toBeDefined();
    });
  });

  describe('side effects: CONFIRMED → CANCELLED triggers wallet refund', () => {
    it('credits customer wallet when paid by non-COD and payment succeeded', async () => {
      const order = makeOrder({
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCESS,
        paymentMethod: PaymentMethod.WALLET,
      });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await service.transition('order-1', OrderStatus.CANCELLED, { userId: 'u1', role: SYSTEM });

      expect(mockWalletService.getOrCreateWallet).toHaveBeenCalledWith('customer-1', 'customer');
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        'customer-wallet-1',
        100,
        TransactionType.REFUND,
        'order-1',
        expect.stringContaining('order-1'),
      );
    });

    it('skips refund for COD orders', async () => {
      const order = makeOrder({
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCESS,
        paymentMethod: PaymentMethod.COD,
      });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await service.transition('order-1', OrderStatus.CANCELLED, { userId: 'u1', role: SYSTEM });
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });

    it('skips refund when payment not yet successful', async () => {
      const order = makeOrder({
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.WALLET,
      });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await service.transition('order-1', OrderStatus.CANCELLED, { userId: 'u1', role: SYSTEM });
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });
  });

  describe('side effects: IN_TRANSIT → DELIVERED triggers commission split', () => {
    it('calls splitCommission with restaurant and driver wallets', async () => {
      const order = makeOrder({ status: OrderStatus.IN_TRANSIT, driverId: 'driver-1' });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.DELIVERED });

      await service.transition('order-1', OrderStatus.DELIVERED, { userId: 'driver-1', role: Role.DRIVER });

      expect(mockWalletService.splitCommission).toHaveBeenCalledWith(
        'order-1',
        80,
        20,
        0.15,
        'rest-wallet-1',
        'driver-wallet-1',
        expect.any(String),
      );
    });

    it('credits restaurant only when driver wallet is missing', async () => {
      const order = makeOrder({ status: OrderStatus.IN_TRANSIT, driverId: 'driver-1', driver: { id: 'driver-1', wallet: null } });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.DELIVERED });

      await service.transition('order-1', OrderStatus.DELIVERED, { userId: 'driver-1', role: Role.DRIVER });

      expect(mockWalletService.splitCommission).not.toHaveBeenCalled();
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        'rest-wallet-1',
        expect.any(Number),
        TransactionType.EARNING,
        'order-1',
        expect.any(String),
      );
    });
  });

  describe('notifications', () => {
    it('notifies on every valid transition', async () => {
      const order = makeOrder({ status: OrderStatus.PREPARING });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.READY });
      mockPrisma.restaurant.findFirst.mockResolvedValue({ id: 'restaurant-1', userId: 'rest-user-1' });

      await service.transition('order-1', OrderStatus.READY, { userId: 'rest-user-1', role: Role.RESTAURANT });

      expect(mockNotifications.notifyOrderStatus).toHaveBeenCalledWith('order-1', OrderStatus.READY);
    });

    it('emits realtime status update after every transition', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING });
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CONFIRMED });

      await service.transition('order-1', OrderStatus.CONFIRMED, { userId: 'u1', role: SYSTEM });

      expect(mockGateway.emitOrderStatusUpdate).toHaveBeenCalledWith('order-1', OrderStatus.CONFIRMED);
    });
  });

  describe('order not found', () => {
    it('throws NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.transition('nonexistent', OrderStatus.CONFIRMED, { userId: 'u1', role: SYSTEM }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
