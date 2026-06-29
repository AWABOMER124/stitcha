'use server';

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import * as driversService from './services/drivers.service';
import {
  createDriverSchema,
  updateDriverSchema,
  assignDriverSchema,
} from './schemas/drivers.schemas';
import type { ActionResult } from '@/lib/types';
import { revalidatePath } from 'next/cache';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/distributor/dashboard');
  return session.user.distributorId as string;
}

export async function getAllDriversAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await driversService.getAllDrivers(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getDriverAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await driversService.getDriver(distributorId, id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createDriverAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createDriverSchema.parse(input);
    const data = await driversService.createDriver(distributorId, parsed);
    revalidatePath('/distributor/drivers');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateDriverAction(id: string, input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = updateDriverSchema.parse(input);
    const data = await driversService.updateDriver(distributorId, id, parsed);
    revalidatePath('/distributor/drivers');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteDriverAction(id: string): Promise<ActionResult<null>> {
  try {
    const distributorId = await getDistributorId();
    await driversService.deleteDriver(distributorId, id);
    revalidatePath('/distributor/drivers');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function assignDriverAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = assignDriverSchema.parse(input);
    const data = await driversService.assignDriver(distributorId, parsed);
    revalidatePath('/distributor/dispatch');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getDriverStatsAction(): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await driversService.getStats(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getPendingDispatchAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await driversService.getPendingDispatch(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
