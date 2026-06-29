/**
 * Categories Module — Public API
 */

export {
  getCategoriesAction,
  getCategoryAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from './actions';

export {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from './services/categories.service';

export {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from './schemas/categories.schemas';

export type { CategoryWithCount, CategoryWithChildren } from './types';
export type { CreateCategoryInput, UpdateCategoryInput } from './schemas/categories.schemas';
