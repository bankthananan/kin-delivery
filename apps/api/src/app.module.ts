import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeoModule } from './geo/geo.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { CartModule } from './cart/cart.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriverModule } from './driver/driver.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) },
    }),
    DatabaseModule,
    GeoModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    WalletModule,
    PaymentsModule,
    RestaurantsModule,
    CartModule,
    DispatchModule,
    DriverModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
