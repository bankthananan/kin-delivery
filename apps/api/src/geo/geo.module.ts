import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { RedisProvider } from './redis.provider';

@Module({
  providers: [GeoService, RedisProvider],
  exports: [GeoService],
})
export class GeoModule {}
