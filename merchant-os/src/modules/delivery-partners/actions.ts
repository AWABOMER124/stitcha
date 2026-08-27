'use server';

import prisma from '@/lib/db/prisma';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { BusinessRuleError } from '@/lib/errors';
import type { ActionResult } from '@/lib/types';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';
import { acceptDeliveryQuote, quotePlatformDelivery } from './services/delivery-operations.service';

async function requireOwnedOrder(orderId: string, permission: 'orders:read' | 'orders:update') {
  const context = await getAuthContext();
  requirePermission(context, permission);
  const order = await prisma.order.findFirst({ where: { id: orderId, merchantId: context.merchantId }, select: { id: true } });
  if (!order) throw new BusinessRuleError('Order not found');
  return order;
}

function requireDeliveryEnabled() {
  if (process.env.PLATFORM_DELIVERY_ENABLED !== 'true') throw new BusinessRuleError('Platform delivery is not available yet');
}

export async function requestMerchantDeliveryQuotesAction(orderId: string): Promise<ActionResult<unknown[]>> {
  try {
    requireDeliveryEnabled();
    await requireOwnedOrder(orderId, 'orders:read');
    return { success: true, data: serializePrismaArray(await quotePlatformDelivery(orderId)) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to request delivery quotes' };
  }
}

export async function acceptMerchantDeliveryQuoteAction(orderId: string, quoteId: string): Promise<ActionResult<unknown>> {
  try {
    requireDeliveryEnabled();
    await requireOwnedOrder(orderId, 'orders:update');
    return { success: true, data: serializePrismaObject(await acceptDeliveryQuote(orderId, quoteId)) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to accept delivery quote' };
  }
}
