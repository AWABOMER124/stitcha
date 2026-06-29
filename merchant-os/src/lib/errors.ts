/**
 * Base application error class.
 * All custom errors extend this for unified error handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Resource was not found (404) */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/** Caller lacks permission (403) */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** Input validation failed (400) */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/** Resource conflict — e.g. duplicate slug (409) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** Unauthorized — not logged in (401) */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** Business rule violation (422) */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

/** Multi-tenant context missing (403) */
export class TenantError extends AppError {
  constructor(message = 'No merchant context found') {
    super(message, 403, 'TENANT_ERROR');
  }
}

/** Converts any thrown value into an ActionResult failure shape */
export function handleActionError(err: unknown): { success: false; error: string } {
  if (err instanceof AppError) return { success: false, error: err.message };
  if (err instanceof Error) return { success: false, error: err.message };
  return { success: false, error: 'An unexpected error occurred' };
}
