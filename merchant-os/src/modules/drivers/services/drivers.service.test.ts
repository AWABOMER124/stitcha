import { describe, it, expect, vi, beforeEach } from 'vitest';

const repoMock = {
  findDriverById: vi.fn(),
  orderBelongsToDistributor: vi.fn(),
  findOrderLocation: vi.fn(),
  findAvailableDriversForAutoAssign: vi.fn(),
  assignDriver: vi.fn(),
};

vi.mock('../repositories/drivers.repository', () => repoMock);

const { assignDriver, autoAssignNearestDriver, autoAssignNearestDriverOrThrow } = await import('./drivers.service');

describe('assignDriver (manual)', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
  });

  it('rejects when the driver does not belong to this distributor', async () => {
    repoMock.findDriverById.mockResolvedValue(null);
    await expect(assignDriver('dist-1', { driverId: 'd1', orderId: 'o1' })).rejects.toThrow('Driver not found');
    expect(repoMock.assignDriver).not.toHaveBeenCalled();
  });

  it('rejects when the driver is inactive', async () => {
    repoMock.findDriverById.mockResolvedValue({ id: 'd1', isActive: false });
    await expect(assignDriver('dist-1', { driverId: 'd1', orderId: 'o1' })).rejects.toThrow('Driver is not active');
  });

  it('rejects when the order does not belong to this distributor (IDOR guard)', async () => {
    repoMock.findDriverById.mockResolvedValue({ id: 'd1', isActive: true });
    repoMock.orderBelongsToDistributor.mockResolvedValue(false);
    await expect(assignDriver('dist-1', { driverId: 'd1', orderId: 'o1' })).rejects.toThrow('Order not found');
    expect(repoMock.assignDriver).not.toHaveBeenCalled();
  });

  it('assigns when driver and order both belong to this distributor', async () => {
    repoMock.findDriverById.mockResolvedValue({ id: 'd1', isActive: true });
    repoMock.orderBelongsToDistributor.mockResolvedValue(true);
    repoMock.assignDriver.mockResolvedValue({ id: 'assignment-1' });

    await assignDriver('dist-1', { driverId: 'd1', orderId: 'o1' });
    expect(repoMock.assignDriver).toHaveBeenCalledWith({ driverId: 'd1', orderId: 'o1' });
  });
});

describe('autoAssignNearestDriver', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
  });

  it('returns null when the order has no location data', async () => {
    repoMock.findOrderLocation.mockResolvedValue(null);
    const result = await autoAssignNearestDriver('dist-1', 'o1');
    expect(result).toBeNull();
    expect(repoMock.findAvailableDriversForAutoAssign).not.toHaveBeenCalled();
  });

  it('returns null when there are no available drivers', async () => {
    repoMock.findOrderLocation.mockResolvedValue({ lat: 15.5, lng: 32.5 });
    repoMock.findAvailableDriversForAutoAssign.mockResolvedValue([]);
    const result = await autoAssignNearestDriver('dist-1', 'o1');
    expect(result).toBeNull();
    expect(repoMock.assignDriver).not.toHaveBeenCalled();
  });

  it('picks the geographically nearest driver among candidates', async () => {
    repoMock.findOrderLocation.mockResolvedValue({ lat: 15.5, lng: 32.5 });
    repoMock.findAvailableDriversForAutoAssign.mockResolvedValue([
      { id: 'far', name: 'Far Driver', currentLat: 20, currentLng: 40 },
      { id: 'near', name: 'Near Driver', currentLat: 15.51, currentLng: 32.51 },
    ]);
    repoMock.assignDriver.mockResolvedValue({ id: 'assignment-1' });

    const result = await autoAssignNearestDriver('dist-1', 'o1');
    expect(result?.driverId).toBe('near');
    expect(repoMock.assignDriver).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: 'near', orderId: 'o1' })
    );
  });

  it('scopes the order lookup to the calling distributor', async () => {
    repoMock.findOrderLocation.mockResolvedValue(null);
    await autoAssignNearestDriver('dist-1', 'o1');
    expect(repoMock.findOrderLocation).toHaveBeenCalledWith('dist-1', 'o1');
  });
});

describe('autoAssignNearestDriverOrThrow', () => {
  beforeEach(() => {
    Object.values(repoMock).forEach((fn) => fn.mockReset());
  });

  it('throws a BusinessRuleError when automation finds nothing', async () => {
    repoMock.findOrderLocation.mockResolvedValue(null);
    await expect(autoAssignNearestDriverOrThrow('dist-1', 'o1')).rejects.toThrow(
      'No eligible driver could be auto-assigned — assign manually instead.'
    );
  });

  it('returns the result when automation succeeds', async () => {
    repoMock.findOrderLocation.mockResolvedValue({ lat: 15.5, lng: 32.5 });
    repoMock.findAvailableDriversForAutoAssign.mockResolvedValue([
      { id: 'd1', name: 'Driver One', currentLat: 15.501, currentLng: 32.501 },
    ]);
    repoMock.assignDriver.mockResolvedValue({ id: 'assignment-1' });

    const result = await autoAssignNearestDriverOrThrow('dist-1', 'o1');
    expect(result.driverId).toBe('d1');
  });
});
