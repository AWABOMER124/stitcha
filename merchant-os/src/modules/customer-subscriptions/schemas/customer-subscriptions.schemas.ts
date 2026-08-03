import { z } from 'zod';

export const grantSubscriptionSchema = z
  .object({
    customerPhone: z.string().min(9),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export type GrantSubscriptionInput = z.infer<typeof grantSubscriptionSchema>;
