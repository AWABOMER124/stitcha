import prisma from '@/lib/db/prisma';
import type { Customer, CustomerAddress, Prisma } from '@prisma/client';
import type { CreateCustomerInput, UpdateCustomerInput, CreateAddressInput, CustomerFilterInput } from '../schemas/customers.schemas';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Customers Repository — Data access layer
// ============================================================================

/** Find customer by ID */
export async function findById(merchantId: string, id: string): Promise<Customer | null> {
  const customer = await prisma.customer.findFirst({
    where: { id, merchantId },
    include: { addresses: true, _count: { select: { orders: true } } },
  });
  return serializePrismaObject(customer);
}

/** Find customer by phone number */
export async function findByPhone(merchantId: string, phone: string): Promise<Customer | null> {
  const customer = await prisma.customer.findFirst({
    where: { merchantId, phone },
  });
  return serializePrismaObject(customer);
}

/** Find all customers with pagination and search */
export async function findAll(merchantId: string, filters: CustomerFilterInput) {
  const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    merchantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: serializePrismaArray(data),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Create a new customer */
export async function create(merchantId: string, data: CreateCustomerInput): Promise<Customer> {
  const customer = await prisma.customer.create({
    data: {
      merchantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    },
  });
  return serializePrismaObject(customer);
}

/** Update a customer */
export async function update(merchantId: string, id: string, data: UpdateCustomerInput): Promise<Customer> {
  const customer = await prisma.customer.update({
    where: { id, merchantId },
    data,
  });
  return serializePrismaObject(customer);
}

/** Add an address to a customer */
export async function addAddress(customerId: string, data: CreateAddressInput): Promise<CustomerAddress> {
  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  return prisma.customerAddress.create({
    data: {
      customerId,
      label: data.label,
      address: data.address,
      area: data.area,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      isDefault: data.isDefault ?? false,
    },
  });
}

/** Get all addresses for a customer */
export async function getAddresses(customerId: string): Promise<CustomerAddress[]> {
  return prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: { isDefault: 'desc' },
  });
}
