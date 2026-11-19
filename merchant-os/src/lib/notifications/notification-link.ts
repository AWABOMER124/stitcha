const fallback = '/dashboard/notifications';
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,150}$/.test(value);
export function safeNotificationPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try { const decoded=decodeURIComponent(value); if (decoded.startsWith('//') || /[\\\s\x00-\x1f\x7f]/.test(decoded)) return null; } catch { return null; }
  return value;
}
export function personalMessageHref(id: string) { return '/inbox?message=' + encodeURIComponent(id) + '#message-' + encodeURIComponent(id); }
export function notificationHref(metadata: unknown, notification?: {id: string; type?: string}): string {
  const value = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
  if (value.kind === 'COMMUNICATION') {
    const path = safeNotificationPath(value.actionPath);
    if (path && !['/inbox','/dashboard','/partner','/marketer'].includes(path)) return path;
    if (identifier(value.deliveryId)) return personalMessageHref(value.deliveryId);
    return path || '/inbox';
  }
  if ((value.kind === 'ORDER' || value.orderId) && identifier(value.orderId)) return '/dashboard/orders/' + value.orderId;
  if (value.kind === 'STORE_MESSAGE') return identifier(value.conversationId) ? '/dashboard/inbox?conversation=' + value.conversationId : '/dashboard/inbox';
  if (value.kind === 'COMPLAINT' && identifier(value.complaintId)) return '/dashboard/complaints?id=' + value.complaintId;
  if (notification?.type === 'LOW_STOCK') return '/dashboard/inventory';
  return notification && identifier(notification.id) ? fallback + '?notification=' + notification.id + '#notification-' + notification.id : fallback;
}
