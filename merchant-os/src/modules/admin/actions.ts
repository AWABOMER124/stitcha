'use server';

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import * as repo from './repository';
import type { ActionResult } from '@/lib/types';
import { revalidatePath } from 'next/cache';

async function assertPlatformOwner() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'PLATFORM_OWNER') redirect('/dashboard');
}

export async function getPlatformStatsAction(): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    return { success: true, data: await repo.getPlatformStats() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getRecentActivityAction(): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
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
    await assertPlatformOwner();
    return { success: true, data: await repo.getAllMerchants(page, limit, search, status) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getPlatformFinanceStatsAction(): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    return { success: true, data: await repo.getPlatformFinanceStats() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getPlatformUsersAction(): Promise<ActionResult<unknown>> {
  try {
    await assertPlatformOwner();
    return { success: true, data: await repo.getPlatformUsers() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
