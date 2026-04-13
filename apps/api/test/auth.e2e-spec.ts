import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/database/prisma.service';
import { JWT_SECRET, createMockPrismaService } from './setup';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrismaService>['prisma'];

  beforeEach(async () => {
    const { prisma } = createMockPrismaService();
    mockPrisma = prisma;

    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('valid CUSTOMER data → 201 with accessToken and user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'customer@test.com', phone: '0812345678', password: 'password123', role: 'CUSTOMER' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('customer@test.com');
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.user.id).toBeDefined();
    });

    it('valid RESTAURANT data → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'rest@test.com', phone: '0812345679', password: 'password123', role: 'RESTAURANT' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('RESTAURANT');
    });

    it('duplicate email → 409 conflict', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', phone: '0812345678', password: 'password123', role: 'CUSTOMER' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', phone: '0812345679', password: 'password456', role: 'CUSTOMER' })
        .expect(409);
    });

    it('missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bad@test.com' })
        .expect(400);
    });

    it('invalid email format → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', phone: '0812345678', password: 'password123', role: 'CUSTOMER' })
        .expect(400);
    });

    it('password too short → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', phone: '0812345678', password: '123', role: 'CUSTOMER' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const email = 'login@test.com';
    const password = 'mypassword';

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, phone: '0812345678', password, role: 'CUSTOMER' });
    });

    it('correct credentials → 200 with accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(email);
    });

    it('wrong password → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrongpassword' })
        .expect(401);
    });

    it('nonexistent email → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password })
        .expect(401);
    });
  });
});
