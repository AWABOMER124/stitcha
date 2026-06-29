'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as categoriesService from './services/categories.service';
import { createCategorySchema, updateCategorySchema, reorderCategoriesSchema } from './schemas/categories.schemas';
import type { ActionResult } from '@/lib/types';
import type { Category } from '@prisma/client';

// ============================================================================
// Categories Module — Server Actions
// ============================================================================

/** List all categories */
export async function getCategoriesAction(includeInactive?: boolean): Promise<ActionResult<Category[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:read');
    const categories = await categoriesService.getCategories(auth.merchantId, includeInactive);
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get categories' };
  }
}

/** Get a single category */
export async function getCategoryAction(id: string): Promise<ActionResult<Category>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:read');
    const category = await categoriesService.getCategory(auth.merchantId, id);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get category' };
  }
}

/** Create a new category */
export async function createCategoryAction(formData: unknown): Promise<ActionResult<Category>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:create');
    const parsed = createCategorySchema.parse(formData);
    const category = await categoriesService.createCategory(auth.merchantId, parsed);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create category' };
  }
}

/** Update a category */
export async function updateCategoryAction(id: string, formData: unknown): Promise<ActionResult<Category>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:update');
    const parsed = updateCategorySchema.parse(formData);
    const category = await categoriesService.updateCategory(auth.merchantId, id, parsed);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update category' };
  }
}

/** Delete a category */
export async function deleteCategoryAction(id: string): Promise<ActionResult<Category>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:delete');
    const category = await categoriesService.deleteCategory(auth.merchantId, id);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete category' };
  }
}

/** Reorder categories */
export async function reorderCategoriesAction(formData: unknown): Promise<ActionResult<void>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'categories:update');
    const parsed = reorderCategoriesSchema.parse(formData);
    await categoriesService.reorderCategories(auth.merchantId, parsed.items);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reorder categories' };
  }
}
