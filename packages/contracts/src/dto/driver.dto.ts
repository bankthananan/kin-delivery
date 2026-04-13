import { z } from 'zod';

export const UpdateLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type UpdateLocation = z.infer<typeof UpdateLocationSchema>;

export const UpdateDriverStatusSchema = z.object({
  isOnline: z.boolean(),
});

export type UpdateDriverStatus = z.infer<typeof UpdateDriverStatusSchema>;
