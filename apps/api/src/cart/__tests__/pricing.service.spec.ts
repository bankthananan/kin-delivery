import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from '../pricing.service';
import { PrismaService } from '../../database/prisma.service';
import { GeoService } from '../../geo/geo.service';
import { REDIS_CLIENT } from '../../geo/redis.provider';
import { OrderTier, OrderStatus } from '@kin-delivery/database';

const DEFAULT_BASE_FEE = 25;
const DEFAULT_DISTANCE_RATE = 8;

describe('PricingService', () => {
  let service: PricingService;
  let mockPrisma: jest.Mocked<Partial<PrismaService>>;
  let mockGeoService: jest.Mocked<Partial<GeoService>>;
  let mockRedis: { set: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      platformConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any,
      order: {
        count: jest.fn().mockResolvedValue(0),
      } as any,
    };

    mockGeoService = {
      findNearbyDrivers: jest.fn().mockResolvedValue([]),
    };

    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeoService, useValue: mockGeoService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculateDeliveryFee', () => {
    const fee = (dist: number, tier: number, surge = 1.0) =>
      (DEFAULT_BASE_FEE + Math.max(0, (dist - 2) * DEFAULT_DISTANCE_RATE)) * tier * surge;

    it('uses FASTEST tier multiplier (1.5x)', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.FASTEST, 1.0);
      expect(result).toBeCloseTo(fee(5, 1.5));
    });

    it('uses NORMAL tier multiplier (1.0x)', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(fee(5, 1.0));
    });

    it('uses SAVER tier multiplier (0.7x)', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.SAVER, 1.0);
      expect(result).toBeCloseTo(fee(5, 0.7));
    });

    it('applies surge multiplier of 1.5x correctly', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.NORMAL, 1.5);
      expect(result).toBeCloseTo(fee(5, 1.0, 1.5));
    });

    it('applies no surge (1.0x) when not surging', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(fee(5, 1.0, 1.0));
    });

    it('edge: 0 distance → only base fee * tier (no distance charge)', async () => {
      const result = await service.calculateDeliveryFee(0, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(DEFAULT_BASE_FEE * 1.0);
    });

    it('edge: 1km distance → only base fee (below 2km threshold)', async () => {
      const result = await service.calculateDeliveryFee(1, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(DEFAULT_BASE_FEE * 1.0);
    });

    it('edge: very long distance (20km) FASTEST with surge', async () => {
      const result = await service.calculateDeliveryFee(20, OrderTier.FASTEST, 1.5);
      expect(result).toBeCloseTo(fee(20, 1.5, 1.5));
    });

    it('reads baseFee from platformConfig when configured', async () => {
      (mockPrisma.platformConfig!.findUnique as jest.Mock)
        .mockResolvedValueOnce({ key: 'delivery.baseFee', value: '30' })
        .mockResolvedValueOnce(null);

      const result = await service.calculateDeliveryFee(2, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(30);
    });

    it('reads distanceRate from platformConfig when configured', async () => {
      (mockPrisma.platformConfig!.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: 'delivery.distanceRate', value: '10' });

      const result = await service.calculateDeliveryFee(5, OrderTier.NORMAL, 1.0);
      expect(result).toBeCloseTo(55);
    });

    it('formula verification: FASTEST, 5km, surge 1.5 → (25 + (5-2)*8) * 1.5 * 1.5 = 110.25', async () => {
      const result = await service.calculateDeliveryFee(5, OrderTier.FASTEST, 1.5);
      expect(result).toBeCloseTo(110.25);
    });
  });

  describe('calculateSurge', () => {
    it('returns 1.5 when driver/order ratio < 0.5 (1 driver, 4 orders = 0.25)', async () => {
      mockGeoService.findNearbyDrivers!.mockResolvedValue([['driver-1', '1.2', ['13.7563', '100.5018']]]);
      (mockPrisma.order!.count as jest.Mock).mockResolvedValue(4);

      const result = await service.calculateSurge(13.7563, 100.5018, 3);
      expect(result).toBe(1.5);
    });

    it('returns 1.0 when driver/order ratio >= 0.5 (2 drivers, 2 orders = 1.0)', async () => {
      mockGeoService.findNearbyDrivers!.mockResolvedValue([
        ['driver-1', '1.0', ['13.7563', '100.5018']],
        ['driver-2', '2.0', ['13.7563', '100.5018']],
      ]);
      (mockPrisma.order!.count as jest.Mock).mockResolvedValue(2);

      const result = await service.calculateSurge(13.7563, 100.5018, 3);
      expect(result).toBe(1.0);
    });

    it('returns 1.0 when no active orders (zero-division guard)', async () => {
      mockGeoService.findNearbyDrivers!.mockResolvedValue([]);
      (mockPrisma.order!.count as jest.Mock).mockResolvedValue(0);

      const result = await service.calculateSurge(13.7563, 100.5018, 3);
      expect(result).toBe(1.0);
    });

    it('uses custom surge threshold: 3 drivers, 5 orders = 0.6 ratio, threshold 0.8 → surges', async () => {
      mockGeoService.findNearbyDrivers!.mockResolvedValue([
        ['driver-1', '1.0', ['13.0', '100.0']],
        ['driver-2', '1.5', ['13.0', '100.0']],
        ['driver-3', '2.0', ['13.0', '100.0']],
      ]);
      (mockPrisma.order!.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.platformConfig!.findUnique as jest.Mock).mockResolvedValue({
        key: 'surge.threshold',
        value: '0.8',
      });

      const result = await service.calculateSurge(13.0, 100.0, 3);
      expect(result).toBe(1.5);
    });
  });

  describe('lockSurge and getSurge', () => {
    it('lockSurge stores surge multiplier in Redis with TTL', async () => {
      await service.lockSurge('customer-1', 1.5);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'surge:lock:customer-1',
        '1.5',
        'EX',
        600,
      );
    });

    it('getSurge returns locked value from Redis', async () => {
      mockRedis.get.mockResolvedValue('1.5');
      const result = await service.getSurge('customer-1');
      expect(result).toBe(1.5);
    });

    it('getSurge returns 1.0 when no locked value', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.getSurge('customer-1');
      expect(result).toBe(1.0);
    });
  });

  describe('getOrComputeSurge', () => {
    it('returns cached surge without recomputing', async () => {
      mockRedis.get.mockResolvedValue('1.5');
      const result = await service.getOrComputeSurge('customer-1', 13.7, 100.5);
      expect(result).toBe(1.5);
      expect(mockGeoService.findNearbyDrivers).not.toHaveBeenCalled();
    });

    it('computes and locks surge when not cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGeoService.findNearbyDrivers!.mockResolvedValue([]);
      (mockPrisma.order!.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrComputeSurge('customer-1', 13.7, 100.5);
      expect(result).toBe(1.0);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'surge:lock:customer-1',
        '1',
        'EX',
        600,
      );
    });
  });
});
