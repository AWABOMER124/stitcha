/**
 * Shared types used across all modules.
 */

/** Standard server action result wrapper */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Pagination input accepted by all list endpoints */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response wrapper */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Date range filter */
export interface DateRange {
  from: Date;
  to: Date;
}
