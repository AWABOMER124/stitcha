import * as repo from '../repositories/drivers.repository';
import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import { findNearest } from '@/lib/geo';
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
  return repo.updateDriver(distributorId, id, input);
}

export async function deleteDriver(distributorId: string, id: string) {
  await getDriver(distributorId, id);
  return repo.deleteDriver(distributorId, id);
}

export async function getOnlineDrivers(distributorId: string) {
  return repo.findOnlineDrivers(distributorId);
}

export async function assignDriver(distributorId: string, input: AssignDriverInput) {
  const driver = await repo.findDriverById(distributorId, input.driverId);
  if (!driver) throw new NotFoundError('Driver not found');
  if (!driver.isActive) throw new Error('Driver is not active');
  const orderOwned = await repo.orderBelongsToDistributor(distributorId, input.orderId);
  if (!orderOwned) throw new NotFoundError('Order not found');
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

export interface AutoAssignResult {
  driverId: string;
  driverName: string;
  distanceKm: number;
}

/**
 * Hybrid assignment's automated path: picks the nearest available driver to
 * the order's merchant location and assigns them. Returns null (rather than
 * throwing) whenever automation simply doesn't have enough to work with —
 * no merchant location on file, or no online driver reporting a location —
 * so the order is left for manual assignment via the dispatch board instead.
 */
export async function autoAssignNearestDriver(distributorId: string, orderId: string): Promise<AutoAssignResult | null> {
  const location = await repo.findOrderLocation(distributorId, orderId);
  if (!location) return null;

  const candidates = await repo.findAvailableDriversForAutoAssign(distributorId);
  if (candidates.length === 0) return null;

  const nearest = findNearest(
    location,
    candidates.map((d) => ({ id: d.id, name: d.name, lat: d.currentLat!, lng: d.currentLng! }))
  );
  if (!nearest) return null;

  await repo.assignDriver({
    driverId: nearest.point.id,
    orderId,
    notes: `Auto-assigned — nearest driver (${nearest.distanceKm.toFixed(1)} km)`,
  });

  return { driverId: nearest.point.id, driverName: nearest.point.name, distanceKm: nearest.distanceKm };
}

/** Manual trigger for the same automated pick, callable on demand from the dispatch board. */
export async function autoAssignNearestDriverOrThrow(distributorId: string, orderId: string): Promise<AutoAssignResult> {
  const result = await autoAssignNearestDriver(distributorId, orderId);
  if (!result) {
    throw new BusinessRuleError('No eligible driver could be auto-assigned — assign manually instead.');
  }
  return result;
}

export async function getDriverEarnings(driverId: string, page: number, limit: number) {
  return repo.getDriverEarnings(driverId, page, limit);
}
