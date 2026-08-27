'use server';

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import * as repo from './repository';
import type { ActionResult } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { z } from 'zod';
import { invitePlatformUser, PLATFORM_STAFF_ROLES, setPlatformUserAccess, updatePlatformUserRole } from './platform-users.service';

const platformUserSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(120),
  role: z.enum(PLATFORM_STAFF_ROLES),
});

async function assertPlatformOwner() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'PLATFORM_OWNER') redirect('/dashboard');
}

export async function getPlatformStatsAction(): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.DASHBOARD);
    return { success: true, data: await repo.getPlatformStats() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getRecentActivityAction(): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.DASHBOARD);
    return { success: true, data: await repo.getRecentActivity() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getAllDistributorsAction(
  page = 1,
  limit = 20,
  search?: string,
): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    return { success: true, data: await repo.getAllDistributors(page, limit, search) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getDistributorByIdAction(id: string): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    const data = await repo.getDistributorById(id);
    if (!data) return { success: false, error: 'Not found' };
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createDistributorAction(input: {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
}): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    const data = await repo.createDistributor(input);
    revalidatePath('/admin/distributors');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateDistributorStatusAction(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING',
): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    const data = await repo.updateDistributorStatus(id, status);
    revalidatePath('/admin/distributors');
    revalidatePath(`/admin/distributors/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateDistributorAction(
  id: string,
  input: Partial<{ name: string; email: string; phone: string; logo: string; commissionRate: number }>,
): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    const data = await repo.updateDistributor(id, input);
    revalidatePath('/admin/distributors');
    revalidatePath(`/admin/distributors/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getAllMerchantsAction(
  page = 1,
  limit = 25,
  search?: string,
  status?: string,
): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
    return { success: true, data: await repo.getAllMerchants(page, limit, search, status) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getPlatformFinanceStatsAction(): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.FINANCE_READ);
    return { success: true, data: await repo.getPlatformFinanceStats() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getPlatformUsersAction(): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE);
    return { success: true, data: await repo.getPlatformUsers() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getMerchantByIdAction(id: string): Promise<ActionResult<unknown>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
    const merchant = await repo.getMerchantById(id);
    return merchant ? { success: true, data: merchant } : { success: false, error: 'Merchant not found' };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Failed' }; }
}

export async function updateMerchantStatusAction(formData: FormData): Promise<void> {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const parsed = z.object({ merchantId: z.string().min(1), status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await repo.updateMerchantStatus(parsed.data.merchantId, parsed.data.status);
  revalidatePath('/admin/merchants');
  revalidatePath(`/admin/merchants/${parsed.data.merchantId}`);
}

export async function invitePlatformUserAction(formData: FormData): Promise<void> {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE);
  const parsed = platformUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await invitePlatformUser(parsed.data);
  revalidatePath('/admin/users');
}

export async function updatePlatformUserRoleAction(formData: FormData): Promise<void> {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE);
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(PLATFORM_STAFF_ROLES) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updatePlatformUserRole(actor.id, parsed.data.userId, parsed.data.role);
  revalidatePath('/admin/users');
}

export async function setPlatformUserAccessAction(formData: FormData): Promise<void> {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE);
  const parsed = z.object({ userId: z.string().min(1), enabled: z.enum(['true', 'false']) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setPlatformUserAccess(actor.id, parsed.data.userId, parsed.data.enabled === 'true');
  revalidatePath('/admin/users');
}
