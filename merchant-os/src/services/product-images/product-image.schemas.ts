import { z } from 'zod';

export const productImageModeSchema = z.enum(['CLEAN_WHITE', 'TRANSPARENT', 'LIFESTYLE']);

export const productImageEnhancementSchema = z.object({
  mode: productImageModeSchema,
  scene: z.string().trim().max(500).optional().default(''),
});

export type ProductImageMode = z.infer<typeof productImageModeSchema>;
export type ProductImageEnhancement = z.infer<typeof productImageEnhancementSchema>;
