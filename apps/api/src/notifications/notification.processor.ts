import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as admin from 'firebase-admin';
import { PrismaService } from '../database/prisma.service';

interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private messaging: admin.messaging.Messaging;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.messaging = admin.messaging();
  }

  async process(job: Job<PushJobData>): Promise<void> {
    const { userId, title, body, data } = job.data;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fcmToken: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found for push notification`);
        return;
      }

      if (!user.fcmToken) {
        this.logger.warn(`User ${userId} has no FCM token registered`);
        return;
      }

      const message: admin.messaging.Message = {
        token: user.fcmToken,
        notification: { title, body },
        data,
      };

      const messageId = await this.messaging.send(message);
      this.logger.log(`Push notification sent to user ${userId} (messageId: ${messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
      throw error;
    }
  }
}
