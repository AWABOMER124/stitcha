import { redirect } from 'next/navigation';
import { auth } from './config';

export async function requireDeliveryPartner() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.deliveryPartnerId) {
    redirect(session.user.role.startsWith('PLATFORM_') ? '/admin' : '/dashboard');
  }
  return { userId: session.user.id, partnerId: session.user.deliveryPartnerId, role: session.user.role };
}
