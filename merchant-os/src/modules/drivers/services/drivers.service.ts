import * as repo from '../repositories/drivers.repository';
import { NotFoundError } from '@/lib/errors';
import type { CreateDriverInput, UpdateDriverInput, AssignDriverInput, UpdateLocationInput } from '../schemas/drivers.schemas';

export async function getAllDrivers(distributorId: string) {
  return repo.findAllDrivers(distributorId);
}

export async function getDriver(distributorId: string, id: string) {
  const driver = await repo.findDriverById(distributorId, id);
  if (!driver) throw new NotFoundError('Driver not found');
  return driver;
}

export async function createDriver(distributorId: string, input: CreateDriverInput) {
  return repo.createDriver(distributorId, input);
}

export async function updateDriver(distributorId: string, id: string, input: UpdateDriverInput) {
  await getDriver(distributorId, id);
  return repo.updateDriver(id, input);
}

export async function deleteDriver(distributorId: string, id: string) {
  await getDriver(distributorId, id);
  return repo.deleteDriver(id);
}

export async function getOnlineDrivers(distributorId: string) {
  return repo.findOnlineDrivers(distributorId);
}

export async function assignDriver(distributorId: string, input: AssignDriverInput) {
  const driver = await repo.findDriverById(distributorId, input.driverId);
  if (!driver) throw new NotFoundError('Driver not found');
  if (!driver.isActive) throw new Error('Driver is not active');
  return repo.assignDriver(input);
}

export async function updateLocation(input: UpdateLocationInput) {
  return repo.updateDriverLocation(input);
}

export async function getStats(distributorId: string) {
  return repo.getDriverStats(distributorId);
}

export async function getPendingDispatch(distributorId: string) {
  return repo.getPendingDispatchOrders(distributorId);
}

export async function getDriverEarnings(driverId: string, page: number, limit: number) {
  return repo.getDriverEarnings(driverId, page, limit);
}
