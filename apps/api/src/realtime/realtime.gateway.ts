import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';

interface AuthenticatedSocket extends Socket {
  user: { sub: string; email: string; role: string };
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly userSocketMap = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        (client.handshake.query['auth'] as string) ||
        client.handshake.headers['authorization']?.replace('Bearer ', '');

      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(token, {
        secret: process.env.JWT_SECRET || 'kin-delivery-jwt-secret-dev',
      });

      client.user = payload;
      this.userSocketMap.set(payload.sub, client.id);
      this.logger.log(`Client connected: ${client.id} (userId: ${payload.sub}, role: ${payload.role})`);
    } catch (err) {
      this.logger.warn(`Rejecting unauthorized connection: ${client.id} — ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.user) {
      this.userSocketMap.delete(client.user.sub);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { sub: userId, role } = client.user;

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      client.emit('error', { message: `Order ${orderId} not found` });
      return;
    }

    let isParticipant = false;

    if (role === 'CUSTOMER' && order.customerId === userId) isParticipant = true;
    if (role === 'DRIVER' && order.driverId === userId) isParticipant = true;
    if (role === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: order.restaurantId, userId },
      });
      if (restaurant) isParticipant = true;
    }

    if (!isParticipant) {
      client.emit('error', { message: 'Not authorized to join this order room' });
      return;
    }

    await client.join(`order:${orderId}`);
    this.logger.log(`User ${userId} (${role}) joined room order:${orderId}`);
  }

  @SubscribeMessage('leave_order')
  async handleLeaveOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    await client.leave(`order:${orderId}`);
    this.logger.log(`User ${client.user?.sub} left room order:${orderId}`);
  }

  emitDriverLocation(orderId: string, location: { lat: number; lng: number }): void {
    this.server.to(`order:${orderId}`).emit('driver_location', { orderId, ...location });
  }

  emitOrderStatusUpdate(orderId: string, status: string): void {
    this.server.to(`order:${orderId}`).emit('order_status', { orderId, status });
  }

  emitOrderPing(driverSocketId: string, orderData: unknown): void {
    this.server.to(driverSocketId).emit('order_ping', orderData);
  }

  getSocketIdByUserId(userId: string): string | undefined {
    return this.userSocketMap.get(userId);
  }
}
