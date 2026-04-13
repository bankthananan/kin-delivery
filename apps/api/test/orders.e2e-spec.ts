import { INestApplication, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import { Reflector } from '@nestjs/core';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { OrderStateService } from '../src/orders/order-state.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JWT_SECRET, generateToken } from './setup';

const CUSTOMER_ID = 'cust_001';
const RESTAURANT_ID = 'rest_001';
const ORDER_ID = 'order_001';

const mockOrder = {
  id: ORDER_ID,
  customerId: CUSTOMER_ID,
  restaurantId: RESTAURANT_ID,
  status: 'PENDING',
  paymentMethod: 'WALLET',
  paymentStatus: 'PENDING',
  subtotal: 200,
  deliveryFee: 30,
  total: 230,
  deliveryLat: 13.75,
  deliveryLng: 100.5,
  deliveryAddress: '123 Test St',
  tier: 'NORMAL',
  items: [],
  restaurant: { id: RESTAURANT_ID, name: 'Test Restaurant' },
  driver: null,
  createdAt: new Date(),
};

function buildMockOrdersService() {
  return {
    createOrder: jest.fn().mockResolvedValue({
      order: { ...mockOrder },
      payment: { paymentMethod: 'WALLET', message: 'Payment deducted from Kin Wallet' },
    }),
    getOrder: jest.fn().mockResolvedValue(mockOrder),
    listOrders: jest.fn().mockResolvedValue({
      data: [mockOrder],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    cancelOrder: jest.fn().mockResolvedValue({ ...mockOrder, status: 'CANCELLED' }),
  };
}

function buildMockOrderStateService() {
  return {
    transition: jest.fn().mockResolvedValue({ ...mockOrder, status: 'PREPARING' }),
  };
}

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let mockOrdersService: ReturnType<typeof buildMockOrdersService>;
  let mockOrderStateService: ReturnType<typeof buildMockOrderStateService>;

  const customerToken = generateToken({ sub: CUSTOMER_ID, email: 'c@test.com', role: 'CUSTOMER' });
  const restaurantToken = generateToken({ sub: 'rest_user_001', email: 'r@test.com', role: 'RESTAURANT' });
  const driverToken = generateToken({ sub: 'drv_001', email: 'd@test.com', role: 'DRIVER' });

  beforeEach(async () => {
    mockOrdersService = buildMockOrdersService();
    mockOrderStateService = buildMockOrderStateService();

    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [OrdersController],
      providers: [
        JwtStrategy,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: OrderStateService, useValue: mockOrderStateService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    const createOrderBody = {
      restaurantId: RESTAURANT_ID,
      items: [{ menuItemId: 'menu_001', quantity: 2 }],
      tier: 'NORMAL',
      paymentMethod: 'WALLET',
      deliveryLat: 13.75,
      deliveryLng: 100.5,
      deliveryAddress: '123 Test St',
    };

    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderBody)
        .expect(401);
    });

    it('with DRIVER role → 403 (CUSTOMER only)', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(createOrderBody)
        .expect(403);
    });

    it('wallet payment → 201 with order and payment info', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderBody)
        .expect(201);

      expect(res.body.order).toBeDefined();
      expect(res.body.order.id).toBe(ORDER_ID);
      expect(res.body.payment.paymentMethod).toBe('WALLET');
    });

    it('COD payment → 201', async () => {
      mockOrdersService.createOrder.mockResolvedValueOnce({
        order: { ...mockOrder, paymentMethod: 'COD', status: 'CONFIRMED' },
        payment: { paymentMethod: 'COD', message: 'Pay upon delivery' },
      });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ ...createOrderBody, paymentMethod: 'COD' })
        .expect(201);

      expect(res.body.payment.paymentMethod).toBe('COD');
    });

    it('service throws BadRequest → 400', async () => {
      mockOrdersService.createOrder.mockRejectedValueOnce(
        new BadRequestException('Restaurant is currently closed'),
      );

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createOrderBody)
        .expect(400);
    });
  });

  describe('GET /orders', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);
    });

    it('with valid CUSTOMER token → 200 with paginated orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBe(1);
      expect(mockOrdersService.listOrders).toHaveBeenCalledWith(
        expect.objectContaining({ sub: CUSTOMER_ID, role: 'CUSTOMER' }),
        1,
        20,
      );
    });

    it('with RESTAURANT token → returns restaurant orders', async () => {
      mockOrdersService.listOrders.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('page/pageSize query params are forwarded', async () => {
      await request(app.getHttpServer())
        .get('/orders?page=2&pageSize=5')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(mockOrdersService.listOrders).toHaveBeenCalledWith(
        expect.anything(),
        2,
        5,
      );
    });
  });

  describe('GET /orders/:id', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer()).get(`/orders/${ORDER_ID}`).expect(401);
    });

    it('with valid token → 200 with order detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.id).toBe(ORDER_ID);
    });

    it('non-participant → 403', async () => {
      mockOrdersService.getOrder.mockRejectedValueOnce(
        new ForbiddenException('You are not a participant of this order'),
      );

      await request(app.getHttpServer())
        .get(`/orders/${ORDER_ID}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('order not found → 404', async () => {
      mockOrdersService.getOrder.mockRejectedValueOnce(
        new NotFoundException('Order not_found not found'),
      );

      await request(app.getHttpServer())
        .get('/orders/not_found')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);
    });
  });

  describe('PUT /orders/:id/status', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .put(`/orders/${ORDER_ID}/status`)
        .send({ status: 'PREPARING' })
        .expect(401);
    });

    it('CUSTOMER role → 403 (RESTAURANT or DRIVER only)', async () => {
      await request(app.getHttpServer())
        .put(`/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'PREPARING' })
        .expect(403);
    });

    it('RESTAURANT valid transition → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ status: 'PREPARING' })
        .expect(200);

      expect(mockOrderStateService.transition).toHaveBeenCalledWith(
        ORDER_ID,
        'PREPARING',
        expect.objectContaining({ role: 'RESTAURANT' }),
      );
    });

    it('invalid state transition → 400', async () => {
      mockOrderStateService.transition.mockRejectedValueOnce(
        new BadRequestException('Invalid state transition: PENDING → DELIVERED'),
      );

      await request(app.getHttpServer())
        .put(`/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ status: 'DELIVERED' })
        .expect(400);
    });

    it('DRIVER valid transition → 200', async () => {
      mockOrderStateService.transition.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PICKED_UP',
      });

      await request(app.getHttpServer())
        .put(`/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'PICKED_UP' })
        .expect(200);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${ORDER_ID}/cancel`)
        .expect(401);
    });

    it('non-CUSTOMER role → 403', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .expect(403);
    });

    it('order owner cancels PENDING order → 200', async () => {
      const res = await request(app.getHttpServer())
        .post(`/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
      expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith(ORDER_ID, CUSTOMER_ID);
    });

    it('cancel order in PREPARING status → 400', async () => {
      mockOrdersService.cancelOrder.mockRejectedValueOnce(
        new BadRequestException("Cannot cancel order with status 'PREPARING'"),
      );

      await request(app.getHttpServer())
        .post(`/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);
    });

    it('cancelling another customer order → 403', async () => {
      mockOrdersService.cancelOrder.mockRejectedValueOnce(
        new ForbiddenException('This order does not belong to you'),
      );

      const otherCustomerToken = generateToken({ sub: 'cust_other', email: 'other@test.com', role: 'CUSTOMER' });
      await request(app.getHttpServer())
        .post(`/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });
  });
});
