'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as productsService from './services/products.service';
import { createProductSchema, updateProductSchema, productFilterSchema } from './schemas/products.schemas';
import type { ActionResult } from '@/lib/types';
import type { Product } from '@prisma/client';
import type { PaginatedResult } from '@/lib/types';

// ============================================================================
// Products Module — Server Actions
// ============================================================================

/** List products with filters and pagination */
export async function getProductsAction(filters: unknown): Promise<ActionResult<PaginatedResult<Product>>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:read');
    const parsed = productFilterSchema.parse(filters);
    const result = await productsService.getProducts(auth.merchantId, parsed);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get products' };
  }
}

/** Get a single product by ID */
export async function getProductAction(id: string): Promise<ActionResult<Product>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:read');
    const product = await productsService.getProduct(auth.merchantId, id);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get product' };
  }
}

/** Create a new product */
export async function createProductAction(formData: unknown): Promise<ActionResult<Product>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:create');
    const parsed = createProductSchema.parse(formData);
    const product = await productsService.createProduct(auth.merchantId, parsed);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product' };
  }
}

/** Update an existing product */
export async function updateProductAction(id: string, formData: unknown): Promise<ActionResult<Product>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:update');
    const parsed = updateProductSchema.parse(formData);
    const product = await productsService.updateProduct(auth.merchantId, id, parsed);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update product' };
  }
}

/** Soft-delete a product */
export async function deleteProductAction(id: string): Promise<ActionResult<Product>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:delete');
    const product = await productsService.deleteProduct(auth.merchantId, id);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete product' };
  }
}

/** Toggle product active status */
export async function toggleProductStatusAction(id: string): Promise<ActionResult<Product>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'products:update');
    const product = await productsService.toggleProductStatus(auth.merchantId, id);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle product status' };
  }
}
