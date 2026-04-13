import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GeoModule } from '../geo/geo.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [DispatchModule, GeoModule, RealtimeModule],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
