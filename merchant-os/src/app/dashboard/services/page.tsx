import { getAuthContext } from '@/lib/permissions';
import { getMerchantBookings, getMerchantServices, BOOKING_STATUS_LABELS } from '@/modules/service-bookings/service-bookings.service';
import { ServiceOperationsClient } from './service-operations-client';

export const metadata = { title: 'الخدمات والمواعيد | وصلة' };
export default async function ServicesPage() {
  const auth = await getAuthContext();
  const [services, bookings] = await Promise.all([getMerchantServices(auth.merchantId), getMerchantBookings(auth.merchantId)]);
  return <ServiceOperationsClient services={services.map(s => ({ id: s.id, name: s.name, isActive: s.isActive, price: Number(s.price), profile: s.serviceProfile ? { ...s.serviceProfile, availability: s.serviceProfile.availability.map(w => ({ id: w.id, branchId: w.branchId, branchName: w.branch?.name ?? null, dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime })) } : null }))} bookings={bookings.map(b => ({ id: b.id, status: b.status, startsAt: b.startsAt?.toISOString() ?? null, participantCount: b.participantCount, customer: b.customer, branch: b.branch, service: b.serviceProfile.product.name, orderNumber: b.order?.orderNumber ?? null, internalNote: b.internalNote }))} labels={BOOKING_STATUS_LABELS} />;
}
