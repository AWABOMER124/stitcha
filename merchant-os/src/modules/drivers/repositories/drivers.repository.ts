import prisma from '@/lib/db/prisma';
import type { CreateDriverInput, UpdateDriverInput, AssignDriverInput, UpdateLocationInput } from '../schemas/drivers.schemas';

export async function findAllDrivers(distributorId: string) {
  return prisma.driver.findMany({
    where: { distributorId },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        where: { deliveredAt: null },
        take: 1,
        orderBy: { assignedAt: 'desc' },
      },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
}

export async function findDriverById(distributorId: string, id: string) {
  return prisma.driver.findFirst({
    where: { id, distributorId },
    include: {
      assignments: {
        orderBy: { assignedAt: 'desc' },
        take: 20,
      },
      earnings: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      locationLogs: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      _count: { select: { assignments: true } },
    },
  });
}

export async function createDriver(distributorId: string, data: CreateDriverInput) {
  return prisma.driver.create({
    data: { ...data, distributorId },
  });
}

export async function updateDriver(id: string, data: UpdateDriverInput) {
  return prisma.driver.update({ where: { id }, data });
}

export async function deleteDriver(id: string) {
  return prisma.driver.delete({ where: { id } });
}

export async function findOnlineDrivers(distributorId: string) {
  return prisma.driver.findMany({
    where: { distributorId, status: 'ONLINE', isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      vehicleType: true,
      vehiclePlate: true,
      status: true,
      rating: true,
      currentLat: true,
      currentLng: true,
      lastSeenAt: true,
      assignments: {
        where: { deliveredAt: null },
        take: 1,
      },
    },
  });
}

export async function assignDriver(data: AssignDriverInput) {
  return prisma.driverAssignment.upsert({
    where: { orderId: data.orderId },
    create: {
      driverId: data.driverId,
      orderId: data.orderId,
      notes: data.notes,
    },
    update: {
      driverId: data.driverId,
      notes: data.notes,
      assignedAt: new Date(),
      acceptedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
    },
  });
}

export async function getAssignment(orderId: string) {
  return prisma.driverAssignment.findUnique({
    where: { orderId },
    include: { driver: true },
  });
}

export async function updateDriverLocation(data: UpdateLocationInput) {
  const { driverId, lat, lng, speed, bearing, accuracy } = data;

  await prisma.$transaction([
    prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: lat,
        currentLng: lng,
        lastSeenAt: new Date(),
        status: 'ONLINE',
      },
    }),
    prisma.driverLocationLog.create({
      data: { driverId, lat, lng, speed: speed ?? null, bearing: bearing ?? null, accuracy: accuracy ?? null },
    }),
  ]);
}

export async function getDriverStats(distributorId: string) {
  const [total, online, busy, onBreak] = await Promise.all([
    prisma.driver.count({ where: { distributorId, isActive: true } }),
    prisma.driver.count({ where: { distributorId, status: 'ONLINE' } }),
    prisma.driver.count({ where: { distributorId, status: 'BUSY' } }),
    prisma.driver.count({ where: { distributorId, status: 'ON_BREAK' } }),
  ]);
  const offline = total - online - busy - onBreak;
  return { total, online, busy, offline, onBreak };
}

export async function getPendingDispatchOrders(distributorId: string) {
  const merchants = await prisma.merchant.findMany({
    where: { distributorId },
    select: { id: true },
  });
  const merchantIds = merchants.map((m) => m.id);

  return prisma.order.findMany({
    where: {
      merchantId: { in: merchantIds },
      status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
    },
    include: {
      merchant: { select: { id: true, name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
