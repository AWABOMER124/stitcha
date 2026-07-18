import { NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/distributor-settings.repository';
import type { UpdateDistributorSettingsInput } from '../schemas/distributor-settings.schemas';

export async function getSettings(distributorId: string) {
  const distributor = await repo.findByDistributor(distributorId);
  if (!distributor) throw new NotFoundError('Distributor');
  return distributor;
}

export async function updateSettings(distributorId: string, input: UpdateDistributorSettingsInput) {
  return repo.update(distributorId, input);
}
