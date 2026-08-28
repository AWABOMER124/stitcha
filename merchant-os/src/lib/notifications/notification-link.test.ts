import { describe, expect, it } from 'vitest';
import { notificationHref } from './notification-link';

describe('notificationHref', () => {
  it('routes operational notifications to their source', () => {
    expect(notificationHref({ kind: 'ORDER', orderId: 'order_1' })).toBe('/dashboard/orders/order_1');
    expect(notificationHref({ kind: 'STORE_MESSAGE', conversationId: 'conv_1' })).toBe('/dashboard/inbox');
    expect(notificationHref({ kind: 'COMPLAINT', complaintId: 'cmp_1' })).toBe('/dashboard/complaints?id=cmp_1');
  });

  it('falls back safely for malformed metadata', () => {
    expect(notificationHref(null)).toBe('/dashboard/notifications');
    expect(notificationHref({ kind: 'ORDER', orderId: 10 })).toBe('/dashboard/notifications');
  });
});
