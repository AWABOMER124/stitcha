/**
 * @module utils/formatting
 * @description Display-formatting helpers for currency, dates, and phone numbers.
 */

import { format, parseISO } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/constants';

/**
 * Formats a numeric amount as a localised currency string.
 * Defaults to Sudanese Pound (SDG).
 */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('ar-SD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a Date (or ISO string) using date-fns.
 * @param date  - Date object or ISO-8601 string.
 * @param fmt   - date-fns format string (default `'dd/MM/yyyy'`).
 */
export function formatDate(date: Date | string, fmt: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

/**
 * Normalises a Sudanese phone number to `+249XXXXXXXXX` format.
 * Returns the original string if it cannot be normalised.
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('249') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+249${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+249${digits}`;
  }
  return phone;
}
