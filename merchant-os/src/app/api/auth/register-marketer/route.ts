import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { isValidInternationalPhone, normalizeInternationalPhone } from '@/lib/utils/formatting';
import { randomBytes } from 'node:crypto';

const schema = z.object({
  name: z.string().trim().min(3).max(120), email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(24), countryCode: z.string().trim().max(4).optional(), password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!checkRateLimit(`marketer-register:${getClientIp(request)}`, 5, 60 * 60_000)) return NextResponse.json({ error: 'عدد المحاولات كبير. حاول لاحقاً.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'راجع بيانات التسجيل.' }, { status: 400 });
  const phone = normalizeInternationalPhone(parsed.data.phone, parsed.data.countryCode);
  if (!isValidInternationalPhone(phone)) return NextResponse.json({ error: 'أدخل رقم واتساب دولياً صحيحاً مع مفتاح الدولة.' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] }, select: { id: true } });
  if (exists) return NextResponse.json({ error: 'البريد الإلكتروني أو رقم الهاتف مستخدم مسبقاً.' }, { status: 409 });
  const user = await prisma.user.create({ data: { name: parsed.data.name, email, phone, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: 'MARKETER', marketerAccount: { create: { acquisitionCode: `MK-${randomBytes(5).toString('hex').toUpperCase()}` } } } });
  return NextResponse.json({ userId: user.id }, { status: 201 });
}
