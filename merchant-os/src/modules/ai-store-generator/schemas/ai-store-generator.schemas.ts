import { z } from 'zod';
import { storeContentSchema, storeGenerationPromptSchema } from '@/services/ai/store-content.schema';

export const generateContentSchema = z.object({
  prompt: storeGenerationPromptSchema,
});

export const createMerchantFromAiSchema = z.object({
  phone: z.string().min(9, 'Valid phone is required'),
  address: z.string().min(1, 'Address is required'),
  businessType: z.enum(['RESTAURANT', 'CAFE', 'GROCERY', 'PHARMACY', 'RETAIL', 'OTHER']).optional(),
  content: storeContentSchema.extend({
    description: storeContentSchema.shape.description.optional(),
    slogan: storeContentSchema.shape.slogan.optional(),
    primaryColor: storeContentSchema.shape.primaryColor.optional(),
    welcomeText: storeContentSchema.shape.welcomeText.optional(),
  }),
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type CreateMerchantFromAiInput = z.infer<typeof createMerchantFromAiSchema>;
