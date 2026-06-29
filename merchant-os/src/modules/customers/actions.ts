'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as customersService from './services/customers.service';
import { createCustomerSchema, updateCustomerSchema, createAddressSchema, customerFilterSchema } from './schemas/customers.schemas';
import type { ActionResult } from '@/lib/types';
import type { Customer, CustomerAddress } from '@prisma/client';

// ============================================================================
// Customers Module — Server Actions
// ============================================================================

/** List customers */
export async function getCustomersAction(filters: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'customers:read');
    const parsed = customerFilterSchema.parse(filters);
    const result = await customersService.getCustomers(auth.merchantId, parsed);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get customers' };
  }
}

/** Get a single customer */
export async function getCustomerAction(id: string): Promise<ActionResult<Customer>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'customers:read');
    const customer = await customersService.getCustomer(auth.merchantId, id);
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get customer' };
  }
}

/** Create a customer */
export async function createCustomerAction(formData: unknown): Promise<ActionResult<Customer>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'customers:create');
    const parsed = createCustomerSchema.parse(formData);
    const customer = await customersService.createCustomer(auth.merchantId, parsed);
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create customer' };
  }
}

/** Update a customer */
export async function updateCustomerAction(id: string, formData: unknown): Promise<ActionResult<Customer>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'customers:update');
    const parsed = updateCustomerSchema.parse(formData);
    const customer = await customersService.updateCustomer(auth.merchantId, id, parsed);
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update customer' };
  }
}

/** Add address to customer */
export async function addCustomerAddressAction(customerId: string, formData: unknown): Promise<ActionResult<CustomerAddress>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'customers:update');
    const parsed = createAddressSchema.parse(formData);
    const address = await customersService.addAddress(auth.merchantId, customerId, parsed);
    return { success: true, data: address };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add address' };
  }
}
