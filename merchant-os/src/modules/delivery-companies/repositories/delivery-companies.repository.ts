import prisma from '@/lib/db/prisma';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';
import type {
  CreateDeliveryCompanyInput,
  UpdateDeliveryCompanyInput,
} from '../schemas/delivery-companies.schemas';

export async function findAll(distributorId: string) {
  const companies = await prisma.deliveryCompany.findMany({
    where: { distributorId },
    include: { _count: { select: { drivers: true, deliveries: true, merchants: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return serializePrismaArray(companies);
}

export async function findById(distributorId: string, id: string) {
  const company = await prisma.deliveryCompany.findFirst({
    where: { id, distributorId },
    include: {
      _count: { select: { drivers: true, deliveries: true, merchants: true } },
      drivers: { select: { id: true, name: true, phone: true } },
    },
  });
  return serializePrismaObject(company);
}

export async function create(distributorId: string, data: CreateDeliveryCompanyInput) {
  const company = await prisma.deliveryCompany.create({
    data: { ...data, distributorId },
  });
  return serializePrismaObject(company);
}

export async function update(distributorId: string, id: string, data: UpdateDeliveryCompanyInput) {
  const result = await prisma.deliveryCompany.updateMany({ where: { id, distributorId }, data });
  if (result.count === 0) throw new Error('Delivery company not found');
  const company = await prisma.deliveryCompany.findUnique({ where: { id } });
  return serializePrismaObject(company);
}

export async function remove(distributorId: string, id: string) {
  const result = await prisma.deliveryCompany.deleteMany({ where: { id, distributorId } });
  if (result.count === 0) throw new Error('Delivery company not found');
  return result;
}

/** Assign (or clear, with deliveryCompanyId = null) a merchant's preferred delivery company. */
export async function assignToMerchant(distributorId: string, merchantId: string, deliveryCompanyId: string | null) {
  if (deliveryCompanyId) {
    const company = await prisma.deliveryCompany.findFirst({ where: { id: deliveryCompanyId, distributorId } });
    if (!company) throw new Error('Delivery company not found');
  }
  const result = await prisma.merchant.updateMany({
    where: { id: merchantId, distributorId },
    data: { preferredDeliveryCompanyId: deliveryCompanyId },
  });
  if (result.count === 0) throw new Error('Merchant not found');
  return { merchantId, deliveryCompanyId };
}

/** All of the distributor's own drivers, with their current delivery-company rep assignment (if any). */
export async function findDriversWithAssignment(distributorId: string) {
  const drivers = await prisma.driver.findMany({
    where: { distributorId },
    select: {
      id: true, name: true, phone: true, isActive: true,
      deliveryCompanyId: true,
      deliveryCompany: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return serializePrismaArray(drivers);
}

/** Assign (or clear) which delivery company a driver represents. */
export async function assignDriver(distributorId: string, driverId: string, deliveryCompanyId: string | null) {
  if (deliveryCompanyId) {
    const company = await prisma.deliveryCompany.findFirst({ where: { id: deliveryCompanyId, distributorId } });
    if (!company) throw new Error('Delivery company not found');
  }
  const result = await prisma.driver.updateMany({
    where: { id: driverId, distributorId },
    data: { deliveryCompanyId },
  });
  if (result.count === 0) throw new Error('Driver not found');
  return { driverId, deliveryCompanyId };
}
