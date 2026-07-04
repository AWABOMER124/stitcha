'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as service from './services/delivery-companies.service';
import { createDeliveryCompanySchema, updateDeliveryCompanySchema } from './schemas/delivery-companies.schemas';
import type { ActionResult } from '@/lib/types';
import { revalidatePath } from 'next/cache';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

export async function getDeliveryCompaniesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.getAll(distributorId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getDeliveryCompanyAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.getOne(distributorId, id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function createDeliveryCompanyAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createDeliveryCompanySchema.parse(formData);
    const data = await service.create(distributorId, parsed);
    revalidatePath('/distributor/delivery-companies');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updateDeliveryCompanyAction(id: string, formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = updateDeliveryCompanySchema.parse(formData);
    const data = await service.update(distributorId, id, parsed);
    revalidatePath('/distributor/delivery-companies');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function deleteDeliveryCompanyAction(id: string): Promise<ActionResult<null>> {
  try {
    const distributorId = await getDistributorId();
    await service.remove(distributorId, id);
    revalidatePath('/distributor/delivery-companies');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function assignDeliveryCompanyToMerchantAction(
  merchantId: string,
  deliveryCompanyId: string | null,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.assignToMerchant(distributorId, merchantId, deliveryCompanyId);
    revalidatePath('/distributor/merchants');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getDriversWithAssignmentAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.getDriversWithAssignment(distributorId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function assignDriverToDeliveryCompanyAction(
  driverId: string,
  deliveryCompanyId: string | null,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.assignDriver(distributorId, driverId, deliveryCompanyId);
    revalidatePath('/distributor/delivery-companies/drivers');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}
