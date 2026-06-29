import prisma from '@/lib/db/prisma';
import type { Merchant, MerchantStatus, Prisma } from '@prisma/client';
import type { PaginationParams } from '@/lib/types';
import type { CreateMerchantInput, UpdateMerchantInput } from '../schemas/merchants.schemas';

// ============================================================================
// Merchants Repository — Data access layer
// ============================================================================

/**
 * Find a merchant by its unique ID.
 */
export async function findById(id: string): Promise<Merchant | null> {
  return prisma.merchant.findUnique({
    where: { id },
  });
}

/**
 * Find a merchant by its URL slug.
 */
export async function findBySlug(slug: string): Promise<Merchant | null> {
  return prisma.merchant.findUnique({
    where: { slug },
  });
}

/**
 * Find all merchants with pagination.
 */
export async function findAll(params: PaginationParams) {
  const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.MerchantWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.merchant.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create a new merchant.
 */
export async function create(data: CreateMerchantInput & { slug: string }): Promise<Merchant> {
  return prisma.merchant.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      businessType: data.businessType,
      phone: data.phone,
      email: data.email,
      address: data.address,
      logo: data.logo,
      coverImage: data.coverImage,
    },
  });
}

/**
 * Update an existing merchant.
 */
export async function update(id: string, data: UpdateMerchantInput): Promise<Merchant> {
  return prisma.merchant.update({
    where: { id },
    data,
  });
}

/**
 * Update merchant status (PENDING → ACTIVE → SUSPENDED → CLOSED).
 */
export async function updateStatus(id: string, status: MerchantStatus): Promise<Merchant> {
  return prisma.merchant.update({
    where: { id },
    data: { status },
  });
}
