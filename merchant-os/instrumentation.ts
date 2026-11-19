/** Web startup must not migrate data, send notifications, or run billing.
 * Scheduled work is owned by the authenticated external job runner and durable outbox.
 * Keep this hook for future read-only observability initialization.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
}
