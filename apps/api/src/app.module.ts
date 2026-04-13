import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeoModule } from './geo/geo.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [DatabaseModule, GeoModule, AuthModule, UsersModule, AddressesModule, WalletModule, PaymentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
