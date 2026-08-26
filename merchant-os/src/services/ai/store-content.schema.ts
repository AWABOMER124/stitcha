import { z } from 'zod';

export const storeGenerationPromptSchema = z.string().trim().min(1, 'Prompt is required').max(2000);

export const storeContentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(1000),
  slogan: z.string().trim().min(1).max(120),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  welcomeText: z.string().trim().min(1).max(500),
  categories: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    products: z.array(z.object({
      name: z.string().trim().min(1).max(120),
      price: z.number().finite().min(0).max(999_999_999),
      description: z.string().trim().max(500).optional(),
    })).min(1).max(50),
  })).min(1).max(30),
});

export type StoreContentResult = z.infer<typeof storeContentSchema>;
