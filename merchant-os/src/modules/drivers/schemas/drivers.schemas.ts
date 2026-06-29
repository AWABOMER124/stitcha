import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(9).max(15),
  nationalId: z.string().max(20).optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'CAR', 'BICYCLE', 'VAN']).default('MOTORCYCLE'),
  vehiclePlate: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

export const updateDriverSchema = createDriverSchema.partial().extend({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  status: z.enum(['OFFLINE', 'ONLINE', 'BUSY', 'ON_BREAK']).optional(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().cuid(),
  orderId: z.string().cuid(),
  notes: z.string().max(500).optional(),
});

export const updateLocationSchema = z.object({
  driverId: z.string().cuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().optional(),
  bearing: z.number().optional(),
  accuracy: z.number().optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
