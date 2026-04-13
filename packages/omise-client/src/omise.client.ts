import * as crypto from 'crypto';
import {
  OmiseInstance,
  OmiseChargeResponse,
  PromptPayChargeResult,
} from './interfaces/omise.interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OmiseFactory = require('omise');

export class OmiseClient {
  private readonly client: OmiseInstance;
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.OMISE_SECRET_KEY ?? '';
    this.client = OmiseFactory({
      secretKey: this.secretKey,
      publicKey: process.env.OMISE_PUBLIC_KEY ?? '',
    }) as OmiseInstance;
  }

  async createPromptPayCharge(
    amount: number,
    orderId: string,
  ): Promise<PromptPayChargeResult> {
    const source = await this.client.sources.create({
      type: 'promptpay',
      amount: Math.round(amount * 100), // Omise ใช้หน่วยสตางค์
      currency: 'thb',
    });

    const charge = await this.client.charges.create({
      amount: Math.round(amount * 100),
      currency: 'thb',
      source: source.id,
      description: `Order ${orderId}`,
      metadata: { orderId },
    });

    return {
      chargeId: charge.id,
      qrCodeUri: charge.source?.scannable_code?.image?.download_uri ?? '',
      expiresAt: charge.expires_at,
    };
  }

  async createCardCharge(
    amount: number,
    cardToken: string,
    orderId: string,
  ): Promise<OmiseChargeResponse> {
    const charge = await this.client.charges.create({
      amount: Math.round(amount * 100),
      currency: 'thb',
      card: cardToken,
      description: `Order ${orderId}`,
      metadata: { orderId },
    });

    return charge;
  }

  verifyWebhook(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }
}
