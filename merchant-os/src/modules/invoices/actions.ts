'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import type { ActionResult } from '@/lib/types';
import * as service from './services/invoices.service';

const idSchema = z.string().min(1).max(100);
const statusSchema = z.enum(['ISSUED', 'PAID', 'VOID']);

export async function getInvoicesAction(): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'invoices:read');
    const [invoices, orders] = await Promise.all([
      service.listInvoices(auth.merchantId),
      service.listOrdersWithoutInvoices(auth.merchantId),
    ]);
    return { success: true, data: { invoices, orders } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load invoices' };
  }
}

export async function getInvoiceAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'invoices:read');
    return { success: true, data: await service.getInvoice(auth.merchantId, idSchema.parse(id)) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load invoice' };
  }
}

export async function createInvoiceAction(orderId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'invoices:create');
    const invoice = await service.createInvoiceFromOrder(auth.merchantId, idSchema.parse(orderId), auth.userId);
    revalidatePath('/dashboard/invoices');
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
  }
}

export async function updateInvoiceStatusAction(id: string, status: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'invoices:update');
    const invoice = await service.updateInvoiceStatus(auth.merchantId, idSchema.parse(id), statusSchema.parse(status));
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true, data: invoice };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update invoice' };
  }
}
