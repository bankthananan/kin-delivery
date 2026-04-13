import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const JWT_SECRET = 'kin-delivery-jwt-secret-dev';

export function generateToken(payload: {
  sub: string;
  email: string;
  role: string;
}): string {
  const jwtService = new JwtService({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } });
  return jwtService.sign(payload);
}

export async function initApp(app: INestApplication): Promise<INestApplication> {
  await app.init();
  return app;
}

export function createMockPrismaService() {
  const store = {
    users: new Map<string, any>(),
    restaurants: new Map<string, any>(),
    menuCategories: new Map<string, any>(),
    menuItems: new Map<string, any>(),
    orders: new Map<string, any>(),
    wallets: new Map<string, any>(),
    transactions: new Map<string, any>(),
  };

  let idCounter = 1;
  const nextId = () => `mock_${idCounter++}`;

  const mockPrisma = {
    _store: store,

    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.email) return store.users.get(where.email) ?? null;
        for (const u of store.users.values()) {
          if (u.id === where.id) return u;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const user = { id: nextId(), ...data, createdAt: new Date(), updatedAt: new Date() };
        store.users.set(user.email, user);
        return user;
      }),
    },

    restaurant: {
      findUnique: jest.fn(async ({ where, include, select }: any) => {
        let restaurant = null;
        if (where.id) restaurant = store.restaurants.get(where.id) ?? null;
        if (where.userId) {
          for (const r of store.restaurants.values()) {
            if (r.userId === where.userId) { restaurant = r; break; }
          }
        }
        if (!restaurant) return null;
        if (include?.menuCategories) {
          restaurant = { ...restaurant, menuCategories: [] };
        }
        return restaurant;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        for (const r of store.restaurants.values()) {
          if (where.userId && r.userId !== where.userId) continue;
          if (where.id && r.id !== where.id) continue;
          return r;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const restaurant = { id: nextId(), isOpen: true, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.restaurants.set(restaurant.id, restaurant);
        return restaurant;
      }),
      update: jest.fn(async ({ where, data, select }: any) => {
        const restaurant = store.restaurants.get(where.id);
        if (!restaurant) throw new Error(`Restaurant ${where.id} not found`);
        Object.assign(restaurant, data);
        if (select) {
          const result: any = {};
          for (const key of Object.keys(select)) result[key] = restaurant[key];
          return result;
        }
        return restaurant;
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },

    menuCategory: {
      findUnique: jest.fn(async ({ where }: any) => store.menuCategories.get(where.id) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const cat = { id: nextId(), ...data, createdAt: new Date(), updatedAt: new Date() };
        store.menuCategories.set(cat.id, cat);
        return cat;
      }),
    },

    menuItem: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const item = store.menuItems.get(where.id) ?? null;
        if (!item) return null;
        if (include?.category) {
          const cat = store.menuCategories.get(item.categoryId);
          return { ...item, category: cat };
        }
        return item;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        const results: any[] = [];
        for (const item of store.menuItems.values()) {
          if (where?.id?.in && !where.id.in.includes(item.id)) continue;
          results.push(item);
        }
        return results;
      }),
      create: jest.fn(async ({ data }: any) => {
        const item = { id: nextId(), isAvailable: true, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.menuItems.set(item.id, item);
        return item;
      }),
      update: jest.fn(async ({ where, data, select }: any) => {
        const item = store.menuItems.get(where.id);
        if (!item) throw new Error(`MenuItem ${where.id} not found`);
        Object.assign(item, data);
        if (select) {
          const result: any = {};
          for (const key of Object.keys(select)) result[key] = item[key];
          return result;
        }
        return item;
      }),
    },

    order: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const order = store.orders.get(where.id) ?? null;
        if (!order) return null;
        const result = { ...order };
        if (include?.restaurant) result.restaurant = store.restaurants.get(order.restaurantId) ?? null;
        if (include?.items) result.items = [];
        if (include?.driver) result.driver = null;
        return result;
      }),
      findMany: jest.fn(async ({ where, orderBy, skip, take, include }: any) => {
        let results = [...store.orders.values()];
        if (where?.customerId) results = results.filter(o => o.customerId === where.customerId);
        if (where?.restaurantId) results = results.filter(o => o.restaurantId === where.restaurantId);
        if (where?.driverId) results = results.filter(o => o.driverId === where.driverId);
        if (skip) results = results.slice(skip);
        if (take) results = results.slice(0, take);
        return results.map(o => ({
          ...o,
          restaurant: store.restaurants.get(o.restaurantId) ?? null,
          items: [],
        }));
      }),
      count: jest.fn(async ({ where }: any) => {
        let results = [...store.orders.values()];
        if (where?.customerId) results = results.filter(o => o.customerId === where.customerId);
        if (where?.restaurantId) results = results.filter(o => o.restaurantId === where.restaurantId);
        return results.length;
      }),
      create: jest.fn(async ({ data, include }: any) => {
        const { items, ...orderData } = data;
        const order = {
          id: nextId(),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          ...orderData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.orders.set(order.id, order);
        const result = { ...order, items: [], restaurant: store.restaurants.get(order.restaurantId) ?? null };
        return result;
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const order = store.orders.get(where.id);
        if (!order) throw new Error(`Order ${where.id} not found`);
        Object.assign(order, data);
        return {
          ...order,
          items: [],
          restaurant: store.restaurants.get(order.restaurantId) ?? null,
          driver: null,
        };
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },

    wallet: {
      findFirst: jest.fn(async ({ where }: any) => {
        for (const w of store.wallets.values()) {
          if (where.customerId && w.customerId !== where.customerId) continue;
          if (where.restaurantId && w.restaurantId !== where.restaurantId) continue;
          if (where.driverId && w.driverId !== where.driverId) continue;
          return w;
        }
        return null;
      }),
      findUnique: jest.fn(async ({ where }: any) => store.wallets.get(where.id) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const wallet = { id: nextId(), balance: { toNumber: () => 0, lessThan: (n: number) => 0 < n, toString: () => '0' }, ...data };
        store.wallets.set(wallet.id, wallet);
        return wallet;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const wallet = store.wallets.get(where.id);
        if (!wallet) throw new Error(`Wallet ${where.id} not found`);
        Object.assign(wallet, data);
        return wallet;
      }),
    },

    transaction: {
      create: jest.fn(async ({ data }: any) => {
        const txn = { id: nextId(), ...data, createdAt: new Date() };
        store.transactions.set(txn.id, txn);
        return txn;
      }),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    },

    $transaction: jest.fn(async (callbackOrArray: any) => {
      if (typeof callbackOrArray === 'function') {
        const tx = {
          user: {
            create: jest.fn(async ({ data }: any) => {
              const user = { id: nextId(), ...data, createdAt: new Date(), updatedAt: new Date() };
              store.users.set(user.email, user);
              return user;
            }),
          },
          customer: { create: jest.fn(async () => ({ id: nextId() })) },
          wallet: {
            create: jest.fn(async ({ data }: any) => {
              const wallet = { id: nextId(), balance: { toNumber: () => 0, lessThan: (n: number) => false, toString: () => '0' }, ...data };
              store.wallets.set(wallet.id, wallet);
              return wallet;
            }),
            findUnique: jest.fn(async ({ where }: any) => store.wallets.get(where.id) ?? null),
            update: jest.fn(async ({ where, data }: any) => {
              const wallet = store.wallets.get(where.id);
              if (!wallet) throw new Error(`Wallet ${where.id} not found`);
              Object.assign(wallet, data);
              return wallet;
            }),
          },
          driver: { create: jest.fn(async () => ({ id: nextId() })) },
          restaurant: {
            create: jest.fn(async ({ data }: any) => {
              const r = { id: nextId(), isOpen: true, ...data, createdAt: new Date(), updatedAt: new Date() };
              store.restaurants.set(r.id, r);
              return r;
            }),
          },
          order: {
            findUnique: jest.fn(async ({ where }: any) => store.orders.get(where.id) ?? null),
            update: jest.fn(async ({ where, data }: any) => {
              const order = store.orders.get(where.id);
              if (!order) throw new Error(`Order ${where.id} not found`);
              Object.assign(order, data);
              return order;
            }),
          },
          transaction: {
            create: jest.fn(async ({ data }: any) => {
              const txn = { id: nextId(), ...data, createdAt: new Date() };
              store.transactions.set(txn.id, txn);
              return txn;
            }),
            count: jest.fn(async () => 0),
            findMany: jest.fn(async () => []),
          },
        };
        return callbackOrArray(tx);
      }
      return Promise.all(callbackOrArray);
    }),

    $queryRawUnsafe: jest.fn(async () => []),
    $connect: jest.fn(async () => {}),
    $disconnect: jest.fn(async () => {}),
  };

  return { prisma: mockPrisma, store };
}
