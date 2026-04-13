import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GeoModule } from '../geo/geo.module';
import { DispatchService } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';
import { TimeoutProcessor } from './timeout.processor';
import { IntransitMonitorProcessor } from './intransit-monitor.processor';

export const ORDER_DISPATCH_QUEUE = 'order-dispatch';
export const ORDER_TIMEOUT_QUEUE = 'order-timeout';
export const INTRANSIT_MONITOR_QUEUE = 'intransit-monitor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ORDER_DISPATCH_QUEUE },
      { name: ORDER_TIMEOUT_QUEUE },
      { name: INTRANSIT_MONITOR_QUEUE },
    ),
    GeoModule,
  ],
  providers: [DispatchService, DispatchProcessor, TimeoutProcessor, IntransitMonitorProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
