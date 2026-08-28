import prisma from '@/lib/db/prisma';
import { ValidationError } from '@/lib/errors';

export async function getPendingDirectRegistration(token: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { registrationToken: token },
    include: {
      users: {
        where: { isOwner: true, isActive: true },
        select: { user: { select: { id: true, email: true, phone: true } } },
        take: 1,
      },
    },
  });

  if (!merchant || merchant.status !== 'PENDING' || !merchant.registrationTokenExpiresAt) {
    throw new ValidationError('رابط تأكيد التسجيل غير صالح');
  }
  if (merchant.registrationTokenExpiresAt < new Date()) {
    throw new ValidationError('انتهت جلسة التسجيل — ابدأ التسجيل من جديد');
  }
  const owner = merchant.users[0]?.user;
  if (!owner) throw new ValidationError('تعذر العثور على مالك المتجر');
  return { merchant, owner };
}

