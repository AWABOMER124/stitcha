import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError, ValidationError } from '@/lib/errors';
import { nanoid } from 'nanoid';
import type { ServiceBookingStatus, ServiceFulfillmentType } from '@prisma/client';

export const BOOKING_STATUS_LABELS: Record<ServiceBookingStatus, string> = {
  PENDING: 'بانتظار التأكيد', CONFIRMED: 'مؤكد', IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل', CANCELLED: 'ملغي', NO_SHOW: 'لم يحضر',
};

export async function getMerchantServices(merchantId: string) {
  return prisma.product.findMany({
    where: { merchantId, itemType: 'SERVICE' },
    include: { category: true, serviceProfile: { include: { availability: { include: { branch: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } } },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export async function getMerchantBookings(merchantId: string) {
  return prisma.serviceBooking.findMany({
    where: { merchantId },
    include: { serviceProfile: { include: { product: { select: { name: true, images: true, price: true } } } }, customer: { select: { name: true, phone: true } }, branch: { select: { name: true } }, order: { select: { id: true, orderNumber: true, total: true, paymentMethod: true } } },
    orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }], take: 300,
  });
}

export async function replaceAvailability(merchantId: string, productId: string, windows: Array<{ branchId?: string; dayOfWeek: number; startTime: string; endTime: string }>) {
  const service = await prisma.product.findFirst({ where: { id: productId, merchantId, itemType: 'SERVICE' }, select: { serviceProfile: { select: { id: true } } } });
  if (!service?.serviceProfile) throw new NotFoundError('Service');
  for (const window of windows) {
    if (!Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(window.startTime) || !/^\d{2}:\d{2}$/.test(window.endTime) || window.startTime >= window.endTime) throw new ValidationError('Invalid service availability window');
  }
  await prisma.$transaction([
    prisma.serviceAvailabilityWindow.deleteMany({ where: { serviceProfileId: service.serviceProfile.id } }),
    ...(windows.map((window) => prisma.serviceAvailabilityWindow.create({ data: { serviceProfileId: service.serviceProfile!.id, ...window } }))),
  ]);
}

export async function updateBookingStatus(merchantId: string, bookingId: string, status: ServiceBookingStatus, internalNote?: string) {
  const booking = await prisma.serviceBooking.findFirst({ where: { id: bookingId, merchantId }, select: { id: true, status: true } });
  if (!booking) throw new NotFoundError('Service booking');
  const flow: Record<ServiceBookingStatus, ServiceBookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [], NO_SHOW: [],
  };
  if (booking.status !== status && !flow[booking.status].includes(status)) throw new BusinessRuleError('Invalid service booking status transition');
  return prisma.serviceBooking.update({ where: { id: bookingId }, data: { status, internalNote: internalNote?.slice(0, 1000) } });
}

type PublicBookingInput = { customerName: string; customerPhone: string; startAt?: string; branchId?: string; participantCount?: number; note?: string; customerAddress?: string };

/** Creates one service order and its operational booking atomically. */
export async function createPublicBooking(merchantSlug: string, productSlug: string, input: PublicBookingInput) {
  const merchant = await prisma.merchant.findFirst({ where: { slug: merchantSlug, status: 'ACTIVE', isActive: true }, select: { id: true, timezone: true } });
  if (!merchant) throw new NotFoundError('Store');
  const product = await prisma.product.findFirst({ where: { merchantId: merchant.id, slug: productSlug, itemType: 'SERVICE', isActive: true }, include: { serviceProfile: { include: { availability: { where: { isActive: true } } } } } });
  if (!product?.serviceProfile) throw new NotFoundError('Service');
  const profile = product.serviceProfile;
  const participants = Math.max(1, Math.min(Number(input.participantCount ?? 1), profile.maxParticipants));
  const startsAt = input.startAt ? new Date(input.startAt) : null;
  if (startsAt && (Number.isNaN(startsAt.valueOf()) || startsAt <= new Date(Date.now() + profile.minimumNoticeMinutes * 60_000))) throw new ValidationError('The selected appointment is no longer available');
  if (profile.bookingRequired && !startsAt) throw new ValidationError('Please select an appointment time');
  if (!profile.bookingRequired && startsAt) throw new ValidationError('This service is requested without an appointment');
  if (profile.fulfillmentType === 'AT_BRANCH' && !input.branchId) throw new ValidationError('Please select a branch');
  if (startsAt && profile.bookingRequired) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: merchant.timezone || 'Africa/Khartoum', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(startsAt);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[value('weekday')];
    const localStart = `${value('hour').padStart(2, '0')}:${value('minute').padStart(2, '0')}`;
    const localEndDate = new Date(startsAt.getTime() + profile.durationMinutes * 60_000);
    const endParts = new Intl.DateTimeFormat('en-US', { timeZone: merchant.timezone || 'Africa/Khartoum', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(localEndDate);
    const localEnd = `${(endParts.find((part) => part.type === 'hour')?.value ?? '').padStart(2, '0')}:${endParts.find((part) => part.type === 'minute')?.value ?? ''}`;
    const eligible = profile.availability.filter((window) => window.dayOfWeek === day && (!window.branchId || window.branchId === input.branchId));
    if (!eligible.some((window) => window.startTime <= localStart && window.endTime >= localEnd)) throw new ValidationError('The selected time is outside the service availability');
  }
  const endsAt = startsAt ? new Date(startsAt.getTime() + (profile.durationMinutes + profile.bufferMinutes) * 60_000) : null;

  return prisma.$transaction(async (tx) => {
    if (input.branchId) {
      const branch = await tx.branch.findFirst({ where: { id: input.branchId, merchantId: merchant.id, isActive: true }, select: { id: true } });
      if (!branch) throw new ValidationError('Selected branch is unavailable');
    }
    if (startsAt) {
      await tx.$queryRaw<Array<{ locked: number }>>`
        SELECT 1::int AS "locked"
        FROM (SELECT pg_advisory_xact_lock(hashtext(${`service-slot:${profile.id}:${input.branchId ?? 'none'}:${startsAt.toISOString()}`}))) AS service_slot_lock
      `;
      const reserved = await tx.serviceBooking.aggregate({ where: { serviceProfileId: profile.id, branchId: input.branchId ?? null, startsAt, status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } }, _sum: { participantCount: true } });
      if ((reserved._sum.participantCount ?? 0) + participants > profile.maxParticipants) throw new BusinessRuleError('This appointment is fully booked');
    }
    let customer = await tx.customer.findFirst({ where: { merchantId: merchant.id, phone: input.customerPhone.trim() } });
    if (!customer) customer = await tx.customer.create({ data: { merchantId: merchant.id, name: input.customerName.trim(), phone: input.customerPhone.trim(), address: input.customerAddress?.trim() || null } });
    const order = await tx.order.create({ data: {
      merchantId: merchant.id, orderNumber: `SRV-${nanoid(8).toUpperCase()}`, customerId: customer.id, branchId: input.branchId,
      subtotal: product.price, deliveryFee: 0, discount: 0, tax: 0, total: product.price,
      deliveryMethod: 'PICKUP', paymentMethod: 'CASH', notes: input.note?.trim() || null,
      customerName: customer.name, customerPhone: customer.phone, customerAddress: input.customerAddress?.trim() || null,
      items: { create: { productId: product.id, productSnapshot: { name: product.name, price: Number(product.price), type: 'SERVICE', durationMinutes: profile.durationMinutes }, quantity: 1, unitPrice: product.price, total: product.price, notes: input.note?.trim() || null } },
      statusHistory: { create: { status: 'NEW', note: 'Service booking created' } },
      payment: { create: { method: 'CASH', amount: product.price } },
    } });
    const booking = await tx.serviceBooking.create({ data: { merchantId: merchant.id, serviceProfileId: profile.id, orderId: order.id, customerId: customer.id, branchId: input.branchId, startsAt, endsAt, participantCount: participants, customerNote: input.note?.trim() || null, fulfillmentSnapshot: { type: profile.fulfillmentType as ServiceFulfillmentType, durationMinutes: profile.durationMinutes, advancePaymentPercent: profile.advancePaymentPercent } } });
    return { bookingId: booking.id, orderId: order.id, orderNumber: order.orderNumber };
  });
}
