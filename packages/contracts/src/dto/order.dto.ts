import { z } from 'zod';
import { OrderStatus, OrderTier, PaymentMethod } from '../enums';

export const CreateOrderSchema = z.object({
  restaurantId: z.string(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
    })
  ),
  tier: z.nativeEnum(OrderTier),
  paymentMethod: z.nativeEnum(PaymentMethod),
  deliveryLat: z.number(),
  deliveryLng: z.number(),
  deliveryAddress: z.string(),
  deliveryNote: z.string().optional(),
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

export const CartValidationSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      restaurantId: z.string(),
      quantity: z.number().int().min(1),
      price: z.number().min(0),
    })
  ),
  deliveryLat: z.number(),
  deliveryLng: z.number(),
  tier: z.nativeEnum(OrderTier),
});

export type CartValidation = z.infer<typeof CartValidationSchema>;
