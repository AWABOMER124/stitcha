/**
 * @module handler
 * @description Centralized error-handling utilities for API routes and server actions.
 */

import { AppError } from './app-error';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export interface ActionErrorResponse {
  success: false;
  error: string;
}

/**
 * Converts an unknown thrown value into a standardized ErrorResponse.
 * Operational AppErrors are passed through; unexpected errors are masked.
 */
export function handleError(err: unknown): ErrorResponse {
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    };
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[UnhandledError]', err);
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  };
}

/**
 * Simplified error handler for Next.js server actions.
 * Returns a flat `{ success: false, error: string }` suitable for form state.
 */
export function handleActionError(err: unknown): ActionErrorResponse {
  if (err instanceof AppError) {
    return { success: false, error: err.message };
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[ActionError]', err);
  }

  return { success: false, error: 'An unexpected error occurred' };
}
