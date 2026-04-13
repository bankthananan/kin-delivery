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

export const ToggleRestaurantStatusSchema = z.object({
  isOpen: z.boolean(),
});

export type ToggleRestaurantStatus = z.infer<typeof ToggleRestaurantStatusSchema>;

export const CreateMenuCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export type CreateMenuCategory = z.infer<typeof CreateMenuCategorySchema>;

export const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
});

export type CreateMenuItem = z.infer<typeof CreateMenuItemSchema>;

export const UpdateRestaurantProfileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type UpdateRestaurantProfile = z.infer<typeof UpdateRestaurantProfileSchema>;
