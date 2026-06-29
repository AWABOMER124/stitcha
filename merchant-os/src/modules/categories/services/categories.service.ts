import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import prisma from '@/lib/db/prisma';
import * as categoriesRepo from '../repositories/categories.repository';
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/categories.schemas';

// ============================================================================
// Categories Service — Business logic
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Get all categories with product counts */
export async function getCategories(merchantId: string, includeInactive = false) {
  return categoriesRepo.findAll(merchantId, includeInactive);
}

/** Get a single category with its products */
export async function getCategory(merchantId: string, id: string) {
  const category = await categoriesRepo.findById(merchantId, id);
  if (!category) throw new NotFoundError('Category', id);
  return category;
}

/** Create a new category */
export async function createCategory(merchantId: string, data: CreateCategoryInput) {
  const slug = generateSlug(data.name);
  const existing = await categoriesRepo.findBySlug(merchantId, slug);
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  return categoriesRepo.create(merchantId, { ...data, slug: finalSlug });
}

/** Update an existing category */
export async function updateCategory(merchantId: string, id: string, data: UpdateCategoryInput) {
  await getCategory(merchantId, id);
  return categoriesRepo.update(merchantId, id, data);
}

/**
 * Delete a category. Blocks deletion if it contains products.
 * @throws BusinessRuleError if category has products
 */
export async function deleteCategory(merchantId: string, id: string) {
  const category = await getCategory(merchantId, id);

  const productCount = await prisma.product.count({
    where: { merchantId, categoryId: id },
  });

  if (productCount > 0) {
    throw new BusinessRuleError(
      `Cannot delete category "${(category as { name: string }).name}" because it contains ${productCount} product(s). Move or delete them first.`
    );
  }

  return categoriesRepo.remove(merchantId, id);
}

/** Reorder categories */
export async function reorderCategories(merchantId: string, items: { id: string; sortOrder: number }[]) {
  return categoriesRepo.reorder(merchantId, items);
}
