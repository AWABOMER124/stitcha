'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { replaceAvailability, updateBookingStatus } from './service-bookings.service';

export async function updateServiceBookingAction(bookingId: string, status: string, internalNote?: string) {
  try {
    const auth = await getAuthContext(); requirePermission(auth, 'orders:update');
    const parsed = z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).parse(status);
    await updateBookingStatus(auth.merchantId, bookingId, parsed, internalNote);
    revalidatePath('/dashboard/services');
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر تحديث الحجز' }; }
}

export async function saveServiceAvailabilityAction(productId: string, windows: unknown) {
  try {
    const auth = await getAuthContext(); requirePermission(auth, 'products:update');
    const parsed = z.array(z.object({ branchId: z.string().cuid().optional(), dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() })).max(30).parse(windows);
    await replaceAvailability(auth.merchantId, productId, parsed);
    revalidatePath('/dashboard/services');
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر حفظ التوفر' }; }
}
