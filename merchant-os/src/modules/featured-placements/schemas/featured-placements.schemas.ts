import { z } from 'zod';

export const createFeaturedPlacementSchema = z
  .object({
    merchantId: z.string().cuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    amount: z.coerce.number().min(0),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export type CreateFeaturedPlacementInput = z.infer<typeof createFeaturedPlacementSchema>;
