import { z } from 'zod';

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  description: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
});

export type CreateRestaurant = z.infer<typeof CreateRestaurantSchema>;

export const UpdateMenuItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export type UpdateMenuItem = z.infer<typeof UpdateMenuItemSchema>;
