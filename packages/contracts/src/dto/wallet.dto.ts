import { z } from 'zod';
import { PaymentMethod } from '../enums';

export const TopupSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1'),
  paymentMethod: z.enum(['PROMPTPAY', 'CARD']),
});

export type Topup = z.infer<typeof TopupSchema>;

export const WithdrawSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal amount is 100'),
  bankAccount: z.string().min(1, 'Bank account is required'),
});

export type Withdraw = z.infer<typeof WithdrawSchema>;
