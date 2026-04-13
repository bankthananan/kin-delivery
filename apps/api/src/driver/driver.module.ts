import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [DispatchModule, GeoModule],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
