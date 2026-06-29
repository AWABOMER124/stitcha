/** Common response types used across all modules */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
