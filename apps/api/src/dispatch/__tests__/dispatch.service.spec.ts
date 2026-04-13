import { ConflictException } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';
import { DispatchProcessor } from '../dispatch.processor';
import { OrderTier, OrderStatus } from '@kin-delivery/database';

const ACTIVE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
];

describe('DispatchService', () => {
  let service: DispatchService;
  let mockDispatchQueue: { add: jest.Mock };
  let mockTimeoutQueue: { add: jest.Mock; getJob: jest.Mock };
  let mockPrisma: { order: { update: jest.Mock } };
  let mockRedis: { set: jest.Mock };

  beforeEach(() => {
    mockDispatchQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    mockTimeoutQueue = {
      add: jest.fn().mockResolvedValue({ id: 'timeout-1' }),
      getJob: jest.fn().mockResolvedValue(null),
    };
    mockPrisma = { order: { update: jest.fn().mockResolvedValue({}) } };
    mockRedis = { set: jest.fn() };

    service = new DispatchService(
      mockDispatchQueue as any,
      mockTimeoutQueue as any,
      mockPrisma as any,
      mockRedis as any,
    );
  });

  describe('dispatchOrder', () => {
    it('queues a dispatch job with 3 attempts and 30s backoff', async () => {
      await service.dispatchOrder('order-1');

      expect(mockDispatchQueue.add).toHaveBeenCalledWith(
        'dispatch',
        { orderId: 'order-1' },
        expect.objectContaining({
          jobId: 'dispatch:order-1',
          attempts: 3,
          backoff: { type: 'fixed', delay: 30_000 },
        }),
      );
    });

    it('uses unique jobId per order preventing duplicate dispatch jobs', async () => {
      await service.dispatchOrder('order-abc');
      expect(mockDispatchQueue.add).toHaveBeenCalledWith(
        'dispatch',
        { orderId: 'order-abc' },
        expect.objectContaining({ jobId: 'dispatch:order-abc' }),
      );
    });
  });

  describe('acceptOrder — SETNX lock', () => {
    it('first driver to accept wins: assigns driver to order', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acceptOrder('order-1', 'driver-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'order:order-1:driver',
        'driver-1',
        'EX',
        86400,
        'NX',
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { driverId: 'driver-1' },
      });
    });

    it('second driver gets ConflictException when lock already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      await expect(service.acceptOrder('order-1', 'driver-2')).rejects.toThrow(ConflictException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('does not update order if Redis lock fails', async () => {
      mockRedis.set.mockResolvedValue(null);
      await service.acceptOrder('order-1', 'driver-3').catch(() => undefined);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});

describe('DispatchProcessor — capacity filtering', () => {
  let processor: DispatchProcessor;
  let mockPrisma: {
    order: { findUnique: jest.Mock; count: jest.Mock };
  };
  let mockGeoService: { findNearbyDrivers: jest.Mock };
  let mockGateway: { getSocketIdByUserId: jest.Mock; emitOrderPing: jest.Mock };

  function makeDriver(id: string, distKm = 1.0): [string, string, [string, string]] {
    return [id, distKm.toString(), ['13.7', '100.5']];
  }

  function makeOrder(tier: OrderTier, overrides = {}) {
    return {
      id: 'order-1',
      tier,
      deliveryLat: 13.76,
      deliveryLng: 100.50,
      restaurant: { lat: 13.75, lng: 100.49 },
      ...overrides,
    };
  }

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    mockGeoService = { findNearbyDrivers: jest.fn() };
    mockGateway = {
      getSocketIdByUserId: jest.fn().mockReturnValue(undefined),
      emitOrderPing: jest.fn(),
    };

    processor = new DispatchProcessor(
      mockPrisma as any,
      mockGeoService as any,
      mockGateway as any,
    );
  });

  describe('FASTEST tier capacity filtering', () => {
    it('excludes drivers with any active order (capacity limit = 0)', async () => {
      const order = makeOrder(OrderTier.FASTEST);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-busy')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow(
        'No eligible drivers found',
      );
    });

    it('accepts drivers with 0 active orders', async () => {
      const order = makeOrder(OrderTier.FASTEST);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-free')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockGateway.getSocketIdByUserId.mockReturnValue('socket-1');

      await processor.process({ data: { orderId: 'order-1' } } as any);
      expect(mockGateway.emitOrderPing).toHaveBeenCalledWith('socket-1', expect.any(Object));
    });
  });

  describe('NORMAL tier capacity filtering', () => {
    it('allows drivers with 1 active order (below limit of 2)', async () => {
      const order = makeOrder(OrderTier.NORMAL);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-1')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      mockGateway.getSocketIdByUserId.mockReturnValue('socket-1');

      await processor.process({ data: { orderId: 'order-1' } } as any);
      expect(mockGateway.emitOrderPing).toHaveBeenCalled();
    });

    it('excludes drivers with 2 active orders (at capacity limit)', async () => {
      const order = makeOrder(OrderTier.NORMAL);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-full')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow(
        'No eligible drivers found',
      );
    });
  });

  describe('SAVER tier capacity filtering', () => {
    it('allows drivers with 2 active orders (below limit of 3)', async () => {
      const order = makeOrder(OrderTier.SAVER);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-1')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      mockGateway.getSocketIdByUserId.mockReturnValue('socket-1');

      await processor.process({ data: { orderId: 'order-1' } } as any);
      expect(mockGateway.emitOrderPing).toHaveBeenCalled();
    });

    it('excludes drivers with 3 active orders (at capacity limit)', async () => {
      const order = makeOrder(OrderTier.SAVER);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-full')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow(
        'No eligible drivers found',
      );
    });
  });

  describe('FASTEST active order exclusion', () => {
    it('excludes driver with an active FASTEST order from NORMAL/SAVER dispatches', async () => {
      const order = makeOrder(OrderTier.NORMAL);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-has-fastest')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow(
        'No eligible drivers found',
      );
    });

    it('excludes driver with a FASTEST active order from another FASTEST dispatch', async () => {
      const order = makeOrder(OrderTier.FASTEST);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([makeDriver('driver-busy')]);

      mockPrisma.order.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow(
        'No eligible drivers found',
      );
    });
  });

  describe('5km radius filtering via GeoService', () => {
    it('queries both restaurant and delivery locations with 5km radius', async () => {
      const order = makeOrder(OrderTier.NORMAL);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockGeoService.findNearbyDrivers.mockResolvedValue([]);

      await expect(processor.process({ data: { orderId: 'order-1' } } as any)).rejects.toThrow();

      expect(mockGeoService.findNearbyDrivers).toHaveBeenCalledWith(
        order.restaurant.lat,
        order.restaurant.lng,
        5,
      );
      expect(mockGeoService.findNearbyDrivers).toHaveBeenCalledWith(
        order.deliveryLat,
        order.deliveryLng,
        5,
      );
    });
  });

  describe('deduplication', () => {
    it('does not count the same driver twice when appearing in both radius queries', async () => {
      const order = makeOrder(OrderTier.NORMAL);
      mockPrisma.order.findUnique.mockResolvedValue(order);

      mockGeoService.findNearbyDrivers
        .mockResolvedValueOnce([makeDriver('driver-1'), makeDriver('driver-2')])
        .mockResolvedValueOnce([makeDriver('driver-1'), makeDriver('driver-3')]);

      mockPrisma.order.count.mockResolvedValue(0);
      mockGateway.getSocketIdByUserId.mockReturnValue('socket-x');

      await processor.process({ data: { orderId: 'order-1' } } as any);

      const pingCount = mockGateway.emitOrderPing.mock.calls.length;
      expect(pingCount).toBe(3);
    });
  });

  describe('order not found', () => {
    it('skips dispatch without error when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await processor.process({ data: { orderId: 'ghost-order' } } as any);
      expect(mockGeoService.findNearbyDrivers).not.toHaveBeenCalled();
    });
  });
});
