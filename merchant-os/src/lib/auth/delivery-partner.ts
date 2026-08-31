import { redirect } from 'next/navigation';
import { auth } from './config';
import prisma from '@/lib/db/prisma';

export async function requireDeliveryPartner() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.deliveryPartnerId) {
    redirect(session.user.role.startsWith('PLATFORM_') ? '/admin' : '/dashboard');
  }
  const membership = await prisma.deliveryPartnerUser.findUnique({
    where: { userId_partnerId: { userId: session.user.id, partnerId: session.user.deliveryPartnerId } },
    include: { partner: true },
  });
  if (!membership?.isActive || !membership.partner.isActive || membership.partner.status === 'SUSPENDED' ||
      !['DELIVERY_PARTNER_OWNER', 'DELIVERY_PARTNER_ADMIN'].includes(membership.role)) redirect('/login?reason=partner-access');
  return { userId: session.user.id, partnerId: membership.partnerId, role: membership.role };
}
