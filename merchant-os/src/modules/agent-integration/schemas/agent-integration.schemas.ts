import { z } from 'zod';

const productDraftSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().min(0),
  description: z.string().max(500).optional(),
});

const categoryDraftSchema = z.object({
  name: z.string().min(1).max(60),
  products: z.array(productDraftSchema).min(1).max(50),
});

/** Body of POST /api/agent/v1/stores/drafts */
export const submitStoreDraftSchema = z.object({
  prompt: z.string().min(1).max(2000),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  slogan: z.string().max(120).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'primaryColor must be a hex color like #16a34a')
    .optional(),
  welcomeText: z.string().max(500).optional(),
  categories: z.array(categoryDraftSchema).min(1).max(30),
});

export type SubmitStoreDraftInput = z.infer<typeof submitStoreDraftSchema>;

/** Body of the distributor-side approval endpoint — the AI can't invent contact info. */
export const approveStoreDraftSchema = z.object({
  phone: z.string().min(9, 'Valid phone is required'),
  address: z.string().min(1, 'Address is required'),
});

export type ApproveStoreDraftInput = z.infer<typeof approveStoreDraftSchema>;

export const rejectStoreDraftSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RejectStoreDraftInput = z.infer<typeof rejectStoreDraftSchema>;

/** Body of POST /api/distributor/api-keys */
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(['stores:draft', 'merchants:read', 'orders:read'])).min(1),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
