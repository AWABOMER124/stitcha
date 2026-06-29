import { z } from 'zod';

/** Shared Zod schemas for common input patterns */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idSchema = z.object({ id: z.string().min(1) });
export const slugSchema = z.object({ slug: z.string().min(1) });
export const phoneSchema = z.string().min(9).max(15);
export const emailSchema = z.string().email();

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
