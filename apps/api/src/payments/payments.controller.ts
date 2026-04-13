import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { OmiseClient, OmiseWebhookEvent } from '@kin-delivery/omise-client';

class PromptPayPaymentDto {
  orderId: string;
  amount: number;
}

class CardPaymentDto {
  orderId: string;
  amount: number;
  cardToken: string;
}

@Controller('payments')
export class PaymentsController {
  private readonly omiseClient = new OmiseClient();
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-omise-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? '';

    if (!this.omiseClient.verifyWebhook(rawBody, signature ?? '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let event: OmiseWebhookEvent;
    try {
      event = JSON.parse(rawBody) as OmiseWebhookEvent;
    } catch {
      this.logger.warn('Failed to parse webhook payload');
      return { received: false };
    }

    if (event.key === 'charge.complete') {
      const charge = event.data;
      await this.paymentsService.processChargeComplete(charge.id, event.key);
    }

    return { received: true };
  }

  @Post('promptpay')
  @HttpCode(HttpStatus.CREATED)
  async initiatePromptPay(@Body() dto: PromptPayPaymentDto) {
    return this.paymentsService.initiatePromptPayPayment(dto.orderId, dto.amount);
  }

  @Post('card')
  @HttpCode(HttpStatus.CREATED)
  async initiateCard(@Body() dto: CardPaymentDto) {
    return this.paymentsService.initiateCardPayment(dto.orderId, dto.amount, dto.cardToken);
  }
}
