/**
 * @module queue
 * @description Pre-configured queue service singleton.
 * Currently uses the synchronous stub; swap for BullMQ / Redis-backed queue in production.
 */

import { SyncQueueService } from './queue.service';

/** Pre-configured queue service singleton. */
export const queueService = new SyncQueueService();

// Re-export types and classes for convenience
export { SyncQueueService } from './queue.service';
export type { QueueJob, QueueService } from './types';
