import { redirect } from 'next/navigation';
import { auth } from './config';
import prisma from '@/lib/db/prisma';

export async function requireDeliveryPartner(options: { verified?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.deliveryPartnerId) {
    redirect(session.user.role.startsWith('PLATFORM_') ? '/admin' : '/dashboard');
  }
  const membership = await prisma.deliveryPartnerUser.findUnique({
    where: { userId_partnerId: { userId: session.user.id, partnerId: session.user.deliveryPartnerId } },
    include: { partner: true, user: { select: { authVersion: true, emailVerified: true, phoneVerifiedAt: true } } },
  });
  if (!membership?.isActive || !membership.partner.isActive || membership.partner.status === 'SUSPENDED' ||
      !['DELIVERY_PARTNER_OWNER', 'DELIVERY_PARTNER_ADMIN'].includes(membership.role)) redirect('/login?reason=partner-access');
  if (membership.user.authVersion !== (session.user.authVersion ?? 0)) redirect('/login?reason=password-changed');
  const verified = !!(membership.user.emailVerified || membership.user.phoneVerifiedAt);
  if (options.verified && !verified) redirect('/partner/security?verify=required');
  return { userId: session.user.id, partnerId: membership.partnerId, role: membership.role, verified };
}
