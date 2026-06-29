'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as paymentsService from './services/payments.service';
import { recordPaymentSchema } from './schemas/payments.schemas';
import type { ActionResult } from '@/lib/types';
import type { Payment } from '@prisma/client';

// ============================================================================
// Payments Module — Server Actions
// ============================================================================

/** Get payment for an order */
export async function getPaymentAction(orderId: string): Promise<ActionResult<Payment>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'payments:read');
    const payment = await paymentsService.getPayment(orderId);
    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get payment' };
  }
}

/** Record a new payment */
export async function recordPaymentAction(formData: unknown): Promise<ActionResult<Payment>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'payments:create');
    const parsed = recordPaymentSchema.parse(formData);
    const payment = await paymentsService.recordPayment(parsed);
    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' };
  }
}

/** Mark a payment as paid */
export async function markAsPaidAction(
  id: string,
  transactionRef?: string
): Promise<ActionResult<Payment>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'payments:update');
    const payment = await paymentsService.markAsPaid(id, transactionRef);
    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark payment as paid' };
  }
}

/** Refund a payment */
export async function refundPaymentAction(id: string): Promise<ActionResult<Payment>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'payments:update');
    const payment = await paymentsService.refund(id);
    return { success: true, data: payment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to refund payment' };
  }
}
