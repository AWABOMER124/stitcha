import { describe, expect, it } from 'vitest';
import { notificationHref, safeNotificationPath } from './notification-link';

describe('notificationHref', () => {
  it('routes operational notifications to their source', () => {
    expect(notificationHref({ kind: 'ORDER', orderId: 'order_1' })).toBe('/dashboard/orders/order_1');
    expect(notificationHref({ kind: 'STORE_MESSAGE', conversationId: 'conv_1' })).toBe('/dashboard/inbox?conversation=conv_1');
    expect(notificationHref({ kind: 'COMPLAINT', complaintId: 'cmp_1' })).toBe('/dashboard/complaints?id=cmp_1');
  });

  it('falls back safely for malformed metadata', () => {
    expect(notificationHref(null)).toBe('/dashboard/notifications');
    expect(notificationHref({ kind: 'ORDER', orderId: 10 })).toBe('/dashboard/notifications');
  });
});

 describe('notification deep links',()=>{
 it('opens a personal message when no campaign destination exists',()=>{for(const actionPath of [null,'/dashboard','/partner','/marketer'])expect(notificationHref({kind:'COMMUNICATION',deliveryId:'delivery_1',actionPath})).toBe('/inbox?message=delivery_1#message-delivery_1');});
 it('keeps a valid campaign destination',()=>{expect(notificationHref({kind:'COMMUNICATION',deliveryId:'delivery_1',actionPath:'/dashboard/verification'})).toBe('/dashboard/verification');});
 it('opens an exact generic alert and sends low stock to inventory',()=>{expect(notificationHref(null,{id:'alert_1',type:'SYSTEM'})).toBe('/dashboard/notifications?notification=alert_1#notification-alert_1');expect(notificationHref(null,{id:'alert_1',type:'LOW_STOCK'})).toBe('/dashboard/inventory');});
 it('rejects unsafe paths and malformed source identifiers',()=>{for(const p of ['https://outside.example','//outside.example','/%2foutside.example','/%5coutside.example','/bad%0aheader','/%','javascript:alert(1)'])expect(safeNotificationPath(p)).toBeNull();expect(notificationHref({kind:'ORDER',orderId:'../admin'})).toBe('/dashboard/notifications');});
 });
