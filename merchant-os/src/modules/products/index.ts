/**
 * Products Module — Public API
 */

export {
  getProductsAction,
  getProductAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  toggleProductStatusAction,
} from './actions';

export {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from './services/products.service';

export {
  createProductSchema,
  updateProductSchema,
  productFilterSchema,
} from './schemas/products.schemas';

export type { ProductWithCategory, ProductFull } from './types';
export type { CreateProductInput, UpdateProductInput, ProductFilterInput } from './schemas/products.schemas';
