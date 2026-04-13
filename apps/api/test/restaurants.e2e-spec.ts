import { INestApplication, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { RestaurantsController } from '../src/restaurants/restaurants.controller';
import { RestaurantsService } from '../src/restaurants/restaurants.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JWT_SECRET, generateToken } from './setup';

jest.mock('../src/common/pipes/zod-validation.pipe', () => ({
  ZodValidationPipe: jest.fn().mockImplementation((schema: any) => ({
    transform(value: any, metadata: any) {
      if (metadata?.type === 'custom') return value;
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: result.error.flatten().fieldErrors,
        });
      }
      return result.data;
    },
  })),
}));

const RESTAURANT_USER_ID = 'rest_user_001';
const RESTAURANT_ID = 'rest_001';
const CATEGORY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const MENU_ITEM_ID = 'item_001';

const mockRestaurant = {
  id: RESTAURANT_ID,
  userId: RESTAURANT_USER_ID,
  name: 'Test Restaurant',
  description: 'Tasty food',
  isOpen: true,
  lat: 13.75,
  lng: 100.5,
  openingTime: '09:00',
  closingTime: '21:00',
  menuCategories: [],
};

function buildMockRestaurantsService() {
  return {
    findNearby: jest.fn().mockResolvedValue([
      { ...mockRestaurant, distanceMeters: 300 },
      { id: 'rest_002', name: 'Near Restaurant', isOpen: true, lat: 13.751, lng: 100.501, distanceMeters: 500 },
    ]),
    findById: jest.fn().mockResolvedValue({ ...mockRestaurant, menuCategories: [] }),
    getMenu: jest.fn().mockResolvedValue({
      id: RESTAURANT_ID,
      name: 'Test Restaurant',
      menuCategories: [
        {
          id: CATEGORY_ID,
          name: 'Mains',
          items: [{ id: MENU_ITEM_ID, name: 'Pad Thai', price: 80, isAvailable: true }],
        },
      ],
    }),
    toggleStatus: jest.fn().mockResolvedValue({ id: RESTAURANT_ID, isOpen: false }),
    createCategory: jest.fn().mockResolvedValue({ id: CATEGORY_ID, name: 'Starters', sortOrder: 0 }),
    createMenuItem: jest.fn().mockResolvedValue({ id: MENU_ITEM_ID, name: 'Spring Roll', price: 60, isAvailable: true }),
    updateMenuItem: jest.fn().mockResolvedValue({ id: MENU_ITEM_ID, name: 'Updated Item', price: 70, isAvailable: true }),
    deleteMenuItem: jest.fn().mockResolvedValue({ id: MENU_ITEM_ID, isAvailable: false }),
    updateProfile: jest.fn().mockResolvedValue({ id: RESTAURANT_ID, name: 'Updated Name' }),
  };
}

describe('Restaurants (e2e)', () => {
  let app: INestApplication;
  let mockRestaurantsService: ReturnType<typeof buildMockRestaurantsService>;

  const restaurantToken = generateToken({ sub: RESTAURANT_USER_ID, email: 'rest@test.com', role: 'RESTAURANT' });
  const customerToken = generateToken({ sub: 'cust_001', email: 'c@test.com', role: 'CUSTOMER' });

  beforeEach(async () => {
    mockRestaurantsService = buildMockRestaurantsService();

    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [RestaurantsController],
      providers: [
        JwtStrategy,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: RestaurantsService, useValue: mockRestaurantsService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /restaurants', () => {
    it('returns nearby restaurants filtered by lat/lng/radius', async () => {
      const res = await request(app.getHttpServer())
        .get('/restaurants?lat=13.75&lng=100.5&radius=0.5')
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(mockRestaurantsService.findNearby).toHaveBeenCalledWith(13.75, 100.5, 0.5);
    });

    it('uses default radius when not provided', async () => {
      await request(app.getHttpServer())
        .get('/restaurants?lat=13.75&lng=100.5')
        .expect(200);

      expect(mockRestaurantsService.findNearby).toHaveBeenCalledWith(13.75, 100.5, 5);
    });

    it('missing lat/lng → 400', async () => {
      await request(app.getHttpServer())
        .get('/restaurants')
        .expect(400);
    });
  });

  describe('GET /restaurants/:id', () => {
    it('returns restaurant detail with menu', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${RESTAURANT_ID}`)
        .expect(200);

      expect(res.body.id).toBe(RESTAURANT_ID);
      expect(res.body.name).toBe('Test Restaurant');
    });

    it('nonexistent restaurant → 404', async () => {
      mockRestaurantsService.findById.mockRejectedValueOnce(
        new NotFoundException(`Restaurant unknown not found`),
      );

      await request(app.getHttpServer())
        .get('/restaurants/unknown')
        .expect(404);
    });
  });

  describe('GET /restaurants/:id/menu', () => {
    it('returns menu categories with items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${RESTAURANT_ID}/menu`)
        .expect(200);

      expect(res.body.menuCategories).toBeInstanceOf(Array);
    });
  });

  describe('PUT /restaurant/status', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .put('/restaurant/status')
        .send({ isOpen: false })
        .expect(401);
    });

    it('CUSTOMER role → 403', async () => {
      await request(app.getHttpServer())
        .put('/restaurant/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isOpen: false })
        .expect(403);
    });

    it('RESTAURANT role → 200 with updated status', async () => {
      const res = await request(app.getHttpServer())
        .put('/restaurant/status')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ isOpen: false })
        .expect(200);

      expect(res.body.id).toBe(RESTAURANT_ID);
      expect(res.body.isOpen).toBe(false);
    });

    it('toggles open status → 200', async () => {
      mockRestaurantsService.toggleStatus.mockResolvedValueOnce({ id: RESTAURANT_ID, isOpen: true });

      const res = await request(app.getHttpServer())
        .put('/restaurant/status')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ isOpen: true })
        .expect(200);

      expect(res.body.isOpen).toBe(true);
    });
  });

  describe('POST /restaurant/menu/categories', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .post('/restaurant/menu/categories')
        .send({ name: 'Soups' })
        .expect(401);
    });

    it('non-RESTAURANT role → 403', async () => {
      await request(app.getHttpServer())
        .post('/restaurant/menu/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Soups' })
        .expect(403);
    });

    it('RESTAURANT role → 201 with created category', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant/menu/categories')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ name: 'Starters', sortOrder: 0 })
        .expect(201);

      expect(res.body.id).toBe(CATEGORY_ID);
      expect(res.body.name).toBe('Starters');
    });
  });

  describe('POST /restaurant/menu/items', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .post('/restaurant/menu/items')
        .send({ categoryId: CATEGORY_ID, name: 'Tom Yum', price: 90 })
        .expect(401);
    });

    it('non-RESTAURANT role → 403', async () => {
      await request(app.getHttpServer())
        .post('/restaurant/menu/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ categoryId: CATEGORY_ID, name: 'Tom Yum', price: 90 })
        .expect(403);
    });

    it('RESTAURANT role → 201 with created item', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant/menu/items')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ categoryId: CATEGORY_ID, name: 'Spring Roll', price: 60 })
        .expect(201);

      expect(res.body.id).toBe(MENU_ITEM_ID);
      expect(res.body.name).toBe('Spring Roll');
    });
  });

  describe('PUT /restaurant/menu/items/:id', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .put(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .send({ price: 95 })
        .expect(401);
    });

    it('non-RESTAURANT role → 403', async () => {
      await request(app.getHttpServer())
        .put(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ price: 95 })
        .expect(403);
    });

    it('RESTAURANT role → 200 with updated item', async () => {
      const res = await request(app.getHttpServer())
        .put(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ name: 'Updated Item', price: 70 })
        .expect(200);

      expect(res.body.name).toBe('Updated Item');
      expect(res.body.price).toBe(70);
    });

    it('item belonging to another restaurant → 403', async () => {
      mockRestaurantsService.updateMenuItem.mockRejectedValueOnce(
        new ForbiddenException('Item does not belong to your restaurant'),
      );

      await request(app.getHttpServer())
        .put(`/restaurant/menu/items/other_item`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ price: 50 })
        .expect(403);
    });
  });

  describe('DELETE /restaurant/menu/items/:id', () => {
    it('without token → 401', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .expect(401);
    });

    it('non-RESTAURANT role → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('RESTAURANT role → 200 with item marked unavailable', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/restaurant/menu/items/${MENU_ITEM_ID}`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .expect(200);

      expect(res.body.isAvailable).toBe(false);
    });
  });
});
