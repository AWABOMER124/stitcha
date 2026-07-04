import { Prisma } from '@prisma/client';

/**
 * Prisma's Decimal (decimal.js under the hood) isn't a plain object and
 * cannot cross a Server Action / Server->Client Component boundary — Next.js
 * throws mid-stream when it tries to serialize one, which shows up to users
 * as a blank "page couldn't load" error rather than a normal error message.
 *
 * Every repository/service that returns a Prisma result containing a
 * Decimal field (money, rates, ratings, etc.) MUST pass it through one of
 * these helpers before returning it from a 'use server' action.
 */

export function isDecimal(value: unknown): value is Prisma.Decimal {
  return value instanceof Prisma.Decimal;
}

/** Converts a single Decimal (or decimal-like) value to a plain number. Passes through null/undefined. */
export function serializeDecimal(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (isDecimal(value)) return value.toNumber();
  return Number(value);
}

/** Same as serializeDecimal but defaults to 0 instead of null — for money fields that are always displayed. */
export function serializeMoney(value: Prisma.Decimal | number | string | null | undefined): number {
  return serializeDecimal(value) ?? 0;
}

/**
 * Deep-clones a Prisma result (object, array, or scalar), converting every
 * Decimal instance to a plain number. Dates and other built-ins are left
 * untouched (React Server Components/Server Actions already know how to
 * serialize Date natively).
 */
export function serializePrismaObject<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (isDecimal(value)) {
    return value.toNumber() as unknown as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializePrismaObject(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializePrismaObject(val);
    }
    return out as T;
  }

  return value;
}

/** Type-clarity wrapper around serializePrismaObject for array results (e.g. findMany). */
export function serializePrismaArray<T>(values: T[]): T[] {
  return values.map((v) => serializePrismaObject(v));
}
