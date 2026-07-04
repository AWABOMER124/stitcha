import { NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/delivery-companies.repository';
import type {
  CreateDeliveryCompanyInput,
  UpdateDeliveryCompanyInput,
} from '../schemas/delivery-companies.schemas';

export async function getAll(distributorId: string) {
  return repo.findAll(distributorId);
}

export async function getOne(distributorId: string, id: string) {
  const company = await repo.findById(distributorId, id);
  if (!company) throw new NotFoundError('Delivery company');
  return company;
}

export async function create(distributorId: string, input: CreateDeliveryCompanyInput) {
  return repo.create(distributorId, input);
}

export async function update(distributorId: string, id: string, input: UpdateDeliveryCompanyInput) {
  return repo.update(distributorId, id, input);
}

export async function remove(distributorId: string, id: string) {
  return repo.remove(distributorId, id);
}

export async function assignToMerchant(distributorId: string, merchantId: string, deliveryCompanyId: string | null) {
  return repo.assignToMerchant(distributorId, merchantId, deliveryCompanyId);
}

export async function getDriversWithAssignment(distributorId: string) {
  return repo.findDriversWithAssignment(distributorId);
}

export async function assignDriver(distributorId: string, driverId: string, deliveryCompanyId: string | null) {
  return repo.assignDriver(distributorId, driverId, deliveryCompanyId);
}
