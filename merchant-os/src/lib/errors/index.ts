/**
 * @module errors
 * @description Barrel export for error classes and handlers.
 */

export {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  BusinessRuleError,
  TenantError,
} from './app-error';

export { handleError, handleActionError } from './handler';
export type { ErrorResponse, ActionErrorResponse } from './handler';
