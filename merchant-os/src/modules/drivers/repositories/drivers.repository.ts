import prisma from '@/lib/db/prisma';
import type { CreateDriverInput, UpdateDriverInput, AssignDriverInput, UpdateLocationInput } from '../schemas/drivers.schemas';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

export async function findAllDrivers(distributorId: string) {
  const drivers = await prisma.driver.findMany({
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
  return serializePrismaArray(drivers);
}

export async function findDriverById(distributorId: string, id: string) {
  const driver = await prisma.driver.findFirst({
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
  return serializePrismaObject(driver);
}

export async function createDriver(distributorId: string, data: CreateDriverInput) {
  const driver = await prisma.driver.create({
    data: { ...data, distributorId },
  });
  return serializePrismaObject(driver);
}

export async function updateDriver(distributorId: string, id: string, data: UpdateDriverInput) {
  const result = await prisma.driver.updateMany({ where: { id, distributorId }, data });
  if (result.count === 0) throw new Error('Driver not found');
  const driver = await prisma.driver.findUnique({ where: { id } });
  return serializePrismaObject(driver);
}

export async function deleteDriver(distributorId: string, id: string) {
  const result = await prisma.driver.deleteMany({ where: { id, distributorId } });
  if (result.count === 0) throw new Error('Driver not found');
  return result;
}

export async function findOnlineDrivers(distributorId: string) {
  const drivers = await prisma.driver.findMany({
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
  return serializePrismaArray(drivers);
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

  const orders = await prisma.order.findMany({
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
  return serializePrismaArray(orders);
}

export async function getDriverEarnings(driverId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [data, total, agg] = await Promise.all([
    prisma.driverEarning.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.driverEarning.count({ where: { driverId } }),
    prisma.driverEarning.aggregate({
      where: { driverId },
      _sum: { amount: true },
    }),
  ]);

  return {
    data: serializePrismaArray(data),
    total: Number(agg._sum.amount ?? 0),
    pagination: { page, limit, count: total, totalPages: Math.ceil(total / limit) },
  };
}
