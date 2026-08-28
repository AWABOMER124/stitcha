export function notificationHref(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '/dashboard/notifications';
  const value = metadata as Record<string, unknown>;
  if ((value.kind === 'ORDER' || value.orderId) && typeof value.orderId === 'string') return `/dashboard/orders/${value.orderId}`;
  if (value.kind === 'STORE_MESSAGE') return '/dashboard/inbox';
  if (value.kind === 'COMPLAINT' && typeof value.complaintId === 'string') return `/dashboard/complaints?id=${value.complaintId}`;
  return '/dashboard/notifications';
}
