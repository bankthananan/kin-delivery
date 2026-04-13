import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './notification.processor';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' }), DatabaseModule],
  providers: [NotificationsService, NotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
