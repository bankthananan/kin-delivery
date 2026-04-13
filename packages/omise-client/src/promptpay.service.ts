import generatePayload = require('promptpay-qr');

export class PromptPayService {
  generateQR(phoneOrTaxId: string, amount: number): string {
    return generatePayload(phoneOrTaxId, { amount });
  }
}
