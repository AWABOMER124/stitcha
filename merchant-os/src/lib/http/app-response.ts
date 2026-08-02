import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';

/**
 * Response helpers for the Flutter app's API surface. The app's Dio
 * interceptors read `{"data": ...}` on success and `{"message": ...}` on
 * error — deliberately different from the `{"error": {...}}` shape used by
 * the internal staff API/server-action error handler.
 */

export function appData(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function appError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
}
