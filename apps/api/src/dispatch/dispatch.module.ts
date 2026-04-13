import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GeoModule } from '../geo/geo.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchService } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';
import { TimeoutProcessor } from './timeout.processor';
import { IntransitMonitorProcessor } from './intransit-monitor.processor';
import { ORDER_DISPATCH_QUEUE, ORDER_TIMEOUT_QUEUE, INTRANSIT_MONITOR_QUEUE } from './dispatch.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: ORDER_DISPATCH_QUEUE },
      { name: ORDER_TIMEOUT_QUEUE },
      { name: INTRANSIT_MONITOR_QUEUE },
    ),
    GeoModule,
    RealtimeModule,
  ],
  providers: [DispatchService, DispatchProcessor, TimeoutProcessor, IntransitMonitorProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
