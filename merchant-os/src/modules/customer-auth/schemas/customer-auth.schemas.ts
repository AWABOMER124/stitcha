import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().min(9, 'رقم هاتف صحيح مطلوب'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export const loginSchema = z.object({
  phone: z.string().min(9, 'رقم هاتف صحيح مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const deviceTokenSchema = z.object({
  token: z.string().min(1, 'التوكن مطلوب'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32, 'رمز التجديد غير صالح'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>;
