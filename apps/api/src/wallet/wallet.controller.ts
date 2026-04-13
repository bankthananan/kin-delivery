import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { OmiseClient, PromptPayService } from '@kin-delivery/omise-client';

class TopupDto {
  amount: number;
  paymentMethod: 'PROMPTPAY' | 'CARD';
  cardToken?: string;
  walletId: string;
}

class WithdrawDto {
  amount: number;
  bankAccount: string;
  walletId: string;
}

@Controller('wallet')
export class WalletController {
  private readonly omiseClient = new OmiseClient();
  private readonly promptPayService = new PromptPayService();

  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Query('walletId') walletId: string) {
    const balance = await this.walletService.getBalance(walletId);
    return { walletId, balance };
  }

  @Get('transactions')
  async getTransactions(
    @Query('walletId') walletId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.walletService.getTransactions(walletId, page, pageSize);
  }

  @Post('topup')
  @HttpCode(HttpStatus.CREATED)
  async topup(@Body() dto: TopupDto): Promise<any> {
    const { walletId, amount, paymentMethod, cardToken } = dto;

    if (paymentMethod === 'PROMPTPAY') {
      const result = await this.omiseClient.createPromptPayCharge(amount, walletId);
      return {
        chargeId: result.chargeId,
        qrCodeUri: result.qrCodeUri,
        expiresAt: result.expiresAt,
        message: 'Scan QR to complete top up',
      };
    }

    if (paymentMethod === 'CARD') {
      if (!cardToken) throw new BadRequestException('cardToken is required for CARD payment');
      const charge = await this.omiseClient.createCardCharge(amount, cardToken, walletId);
      if (charge.status === 'successful') {
        const transaction = await this.walletService.topup(walletId, amount, charge.id);
        return { transaction, chargeId: charge.id };
      }
      return { status: charge.status, chargeId: charge.id, message: 'Payment not completed' };
    }

    throw new BadRequestException('Invalid paymentMethod');
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(@Body() dto: WithdrawDto): Promise<any> {
    const { walletId, amount } = dto;
    const transaction = await this.walletService.withdraw(walletId, amount);
    return { transaction, message: 'Withdrawal initiated — pending bank transfer' };
  }
}
