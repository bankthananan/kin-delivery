import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { RedisProvider, REDIS_CLIENT } from './redis.provider';

@Module({
  providers: [GeoService, RedisProvider],
  exports: [GeoService, REDIS_CLIENT],
})
export class GeoModule {}
