import prisma from '@/lib/db/prisma';
import { serializePrismaObject } from '@/lib/serialization';
import type { UpdateDistributorSettingsInput } from '../schemas/distributor-settings.schemas';

export async function findByDistributor(distributorId: string) {
  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    select: { id: true, name: true, phone: true, email: true, slug: true, status: true, commissionRate: true },
  });
  return serializePrismaObject(distributor);
}

export async function update(distributorId: string, data: UpdateDistributorSettingsInput) {
  const distributor = await prisma.distributor.update({
    where: { id: distributorId },
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
    },
    select: { id: true, name: true, phone: true, email: true, slug: true, status: true, commissionRate: true },
  });
  return serializePrismaObject(distributor);
}
