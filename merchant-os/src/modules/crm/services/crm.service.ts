import * as repo from '../repositories/crm.repository';
import type { UpdateCustomerInput, CreatePromoCodeInput, UpdateLoyaltyConfigInput } from '../schemas/crm.schemas';
import type { CustomerSegment } from '@prisma/client';

export async function getAllCustomers(merchantId: string, segment?: CustomerSegment) {
  return repo.findAllCustomers(merchantId, segment);
}

export async function getCustomer(merchantId: string, id: string) {
  const customer = await repo.findCustomerById(merchantId, id);
  if (!customer) throw new Error('Customer not found');
  return customer;
}

export async function updateCustomer(merchantId: string, id: string, input: UpdateCustomerInput) {
  await getCustomer(merchantId, id);
  return repo.updateCustomer(id, input);
}

export async function getCustomerOrders(merchantId: string, customerId: string) {
  return repo.getOrdersForCustomer(merchantId, customerId);
}

export async function getStats(merchantId: string) {
  return repo.getCustomerStats(merchantId);
}

export async function getAllPromoCodes(merchantId: string) {
  return repo.findAllPromoCodes(merchantId);
}

export async function createPromoCode(merchantId: string, input: CreatePromoCodeInput) {
  const existing = await repo.findPromoByCode(merchantId, input.code);
  if (existing) throw new Error('كود الخصم موجود مسبقاً');
  return repo.createPromoCode(merchantId, input);
}

export async function togglePromoCode(merchantId: string, id: string, isActive: boolean) {
  return repo.togglePromoCode(merchantId, id, isActive);
}

export async function deletePromoCode(merchantId: string, id: string) {
  return repo.deletePromoCode(merchantId, id);
}

export async function validatePromo(merchantId: string, code: string, orderAmount: number) {
  return repo.validatePromoCode(merchantId, code, orderAmount);
}

export async function getLoyaltyConfig(merchantId: string) {
  return repo.getLoyaltyConfig(merchantId);
}

export async function updateLoyaltyConfig(merchantId: string, input: UpdateLoyaltyConfigInput) {
  return repo.upsertLoyaltyConfig(merchantId, input);
}

export async function getLoyaltyLeaderboard(merchantId: string) {
  return repo.getLoyaltyLeaderboard(merchantId);
}
