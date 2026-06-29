import prisma from '@/lib/db/prisma';
import type { Category, Prisma } from '@prisma/client';
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/categories.schemas';

// ============================================================================
// Categories Repository — Data access layer
// ============================================================================

/** Find a category by ID, scoped to merchant */
export async function findById(merchantId: string, id: string): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { id, merchantId },
    include: { children: true, parent: true, _count: { select: { products: true } } },
  });
}

/** Find a category by slug, scoped to merchant */
export async function findBySlug(merchantId: string, slug: string): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { merchantId, slug },
  });
}

/** Find all categories for a merchant, ordered by sortOrder */
export async function findAll(merchantId: string, includeInactive = false) {
  const where: Prisma.CategoryWhereInput = {
    merchantId,
    ...(!includeInactive && { isActive: true }),
  };

  return prisma.category.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: {
      children: true,
      _count: { select: { products: true } },
    },
  });
}

/** Create a new category with auto-generated slug */
export async function create(merchantId: string, data: CreateCategoryInput & { slug: string }): Promise<Category> {
  return prisma.category.create({
    data: {
      merchantId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      parentId: data.parentId,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

/** Update an existing category */
export async function update(merchantId: string, id: string, data: UpdateCategoryInput): Promise<Category> {
  return prisma.category.update({
    where: { id, merchantId },
    data,
  });
}

/** Delete a category */
export async function remove(merchantId: string, id: string): Promise<Category> {
  return prisma.category.delete({
    where: { id, merchantId },
  });
}

/** Reorder multiple categories at once */
export async function reorder(merchantId: string, items: { id: string; sortOrder: number }[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id, merchantId },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
}
