import { z } from 'zod';

export const generateContentSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export const createMerchantFromAiSchema = z.object({
  phone: z.string().min(9, 'Valid phone is required'),
  address: z.string().min(1, 'Address is required'),
  businessType: z.enum(['RESTAURANT', 'CAFE', 'GROCERY', 'PHARMACY', 'RETAIL', 'OTHER']).optional(),
  content: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    slogan: z.string().max(120).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    welcomeText: z.string().max(500).optional(),
    categories: z
      .array(
        z.object({
          name: z.string().min(1).max(60),
          products: z
            .array(
              z.object({
                name: z.string().min(1).max(120),
                price: z.number().min(0),
                description: z.string().max(500).optional(),
              })
            )
            .min(1)
            .max(50),
        })
      )
      .min(1)
      .max(30),
  }),
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type CreateMerchantFromAiInput = z.infer<typeof createMerchantFromAiSchema>;
