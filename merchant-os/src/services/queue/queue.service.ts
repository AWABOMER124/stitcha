/**
 * @module SyncQueueService
 * @description Synchronous queue implementation that executes jobs immediately.
 * ⚠️  This is a development stub — jobs run in the same process/request cycle.
 * Replace with BullMQ, Quirrel, or similar for production workloads.
 */

import type { QueueJob, QueueService } from './types';

export class SyncQueueService implements QueueService {
  private handlers = new Map<string, (data: unknown) => Promise<void>>();

  /**
   * Enqueue a job for immediate synchronous execution.
   * ⚠️  WARNING: This executes the handler in-band — no actual queue is used.
   */
  async enqueue<T>(job: QueueJob<T>): Promise<void> {
    console.warn(
      `[SyncQueue] ⚠️  Executing job "${job.name}" synchronously. ` +
      `This is a development stub — use a real queue (BullMQ, etc.) in production.`,
    );

    if (job.delay) {
      console.warn(
        `[SyncQueue] Job "${job.name}" requested a ${job.delay}ms delay — ignored in sync mode.`,
      );
    }

    const handler = this.handlers.get(job.name);

    if (!handler) {
      console.warn(`[SyncQueue] No handler registered for job "${job.name}". Skipping.`);
      return;
    }

    try {
      await handler(job.data);
    } catch (error) {
      console.error(`[SyncQueue] Job "${job.name}" failed:`, error);
    }
  }

  /**
   * Register a handler for a named job type.
   */
  process<T>(name: string, handler: (data: T) => Promise<void>): void {
    this.handlers.set(name, handler as (data: unknown) => Promise<void>);
    console.log(`[SyncQueue] Handler registered for job "${name}".`);
  }
}
