import { z } from 'zod';

export const CreateAddressSchema = z.object({
  label: z.string().min(1, 'Address label is required'),
  lat: z.number(),
  lng: z.number(),
  addressStr: z.string().min(1, 'Address string is required'),
});

export type CreateAddress = z.infer<typeof CreateAddressSchema>;

export const NearestAddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type NearestAddress = z.infer<typeof NearestAddressSchema>;
