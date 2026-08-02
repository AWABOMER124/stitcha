import { describe, it, expect } from 'vitest';
import { mapOrderStatusForApp } from './storefront.service';
import type { OrderStatus } from '@prisma/client';

describe('mapOrderStatusForApp', () => {
  it.each([
    ['NEW', 'pending'],
    ['ACCEPTED', 'pending'],
    ['PREPARING', 'preparing'],
    ['READY', 'preparing'],
    ['OUT_FOR_DELIVERY', 'delivering'],
    ['DELIVERED', 'completed'],
    ['CANCELLED', 'cancelled'],
    ['REJECTED', 'cancelled'],
  ] satisfies [OrderStatus, string][])('maps %s to %s', (input, expected) => {
    expect(mapOrderStatusForApp(input)).toBe(expected);
  });
});
