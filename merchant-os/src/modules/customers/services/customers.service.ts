import { NotFoundError } from '@/lib/errors';
import * as customersRepo from '../repositories/customers.repository';
import type { CreateCustomerInput, UpdateCustomerInput, CreateAddressInput, CustomerFilterInput } from '../schemas/customers.schemas';

// ============================================================================
// Customers Service — Business logic
// ============================================================================

/** Get paginated list of customers */
export async function getCustomers(merchantId: string, filters: CustomerFilterInput) {
  return customersRepo.findAll(merchantId, filters);
}

/** Get a single customer with order history */
export async function getCustomer(merchantId: string, id: string) {
  const customer = await customersRepo.findById(merchantId, id);
  if (!customer) throw new NotFoundError('Customer', id);
  return customer;
}

/**
 * Create or find an existing customer by phone (upsert).
 * If a customer with the same phone exists, returns the existing one.
 */
export async function createCustomer(merchantId: string, data: CreateCustomerInput) {
  const existing = await customersRepo.findByPhone(merchantId, data.phone);
  if (existing) return existing;
  return customersRepo.create(merchantId, data);
}

/** Update customer info */
export async function updateCustomer(merchantId: string, id: string, data: UpdateCustomerInput) {
  await getCustomer(merchantId, id);
  return customersRepo.update(merchantId, id, data);
}

/** Add an address to a customer */
export async function addAddress(merchantId: string, customerId: string, data: CreateAddressInput) {
  await getCustomer(merchantId, customerId); // verify customer belongs to merchant
  return customersRepo.addAddress(customerId, data);
}

/** Get addresses for a customer */
export async function getAddresses(merchantId: string, customerId: string) {
  await getCustomer(merchantId, customerId);
  return customersRepo.getAddresses(customerId);
}
