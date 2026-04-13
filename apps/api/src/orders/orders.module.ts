import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { CartModule } from '../cart/cart.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStateService } from './order-state.service';

@Module({
  imports: [WalletModule, CartModule, RealtimeModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateService],
  exports: [OrdersService, OrderStateService],
})
export class OrdersModule {}
