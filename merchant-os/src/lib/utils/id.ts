import { nanoid } from 'nanoid';

/** Generate a sequential order number (ORD-0001 format) */
export function generateOrderNumber(lastNumber?: string): string {
  if (!lastNumber) return 'ORD-0001';
  const num = parseInt(lastNumber.replace('ORD-', ''), 10);
  return `ORD-${String(num + 1).padStart(4, '0')}`;
}

/** Generate a short unique ID */
export function generateId(): string {
  return nanoid(12);
}
