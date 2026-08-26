import type { OutboxJob, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';

export type OutboxHandler = (payload: unknown, job: OutboxJob) => Promise<void>;
export type OutboxHandlers = ReadonlyMap<string, OutboxHandler>;

export interface EnqueueJobInput {
  topic: string;
  payload: Prisma.InputJsonValue;
  idempotencyKey: string;
  maxAttempts?: number;
  availableAt?: Date;
}

export type OutboxClient = Pick<Prisma.TransactionClient, 'outboxJob'>;

export async function enqueueJob(
  input: EnqueueJobInput,
  client: OutboxClient = prisma,
): Promise<OutboxJob> {
  return client.outboxJob.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      topic: input.topic,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      maxAttempts: input.maxAttempts ?? 5,
      availableAt: input.availableAt,
    },
  });
}

export interface ProcessOutboxOptions {
  workerId: string;
  handlers: OutboxHandlers;
  batchSize?: number;
  lockTimeoutMs?: number;
  retryBaseDelayMs?: number;
  now?: Date;
}

export interface ProcessOutboxResult {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}

export async function processOutboxBatch(
  options: ProcessOutboxOptions,
): Promise<ProcessOutboxResult> {
  const now = options.now ?? new Date();
  const batchSize = Math.min(Math.max(options.batchSize ?? 25, 1), 100);
  const lockTimeoutMs = Math.max(options.lockTimeoutMs ?? 30 * 60_000, 1_000);
  const staleBefore = new Date(now.getTime() - lockTimeoutMs);
  await failExhaustedStaleJobs(staleBefore, now);
  const jobs = await claimJobs(options.workerId, batchSize, now, staleBefore);
  const result: ProcessOutboxResult = {
    claimed: jobs.length,
    completed: 0,
    retried: 0,
    failed: 0,
  };

  for (const job of jobs) {
    const handler = options.handlers.get(job.topic);
    try {
      if (!handler) throw new Error(`No outbox handler registered for topic: ${job.topic}`);
      await handler(job.payload, job);
      await prisma.outboxJob.updateMany({
        where: { id: job.id, status: 'PROCESSING', lockedBy: options.workerId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });
      result.completed += 1;
    } catch (error) {
      const exhausted = job.attempts >= job.maxAttempts;
      const retryDelay = (options.retryBaseDelayMs ?? 30_000) * 2 ** Math.max(job.attempts - 1, 0);
      await prisma.outboxJob.updateMany({
        where: { id: job.id, status: 'PROCESSING', lockedBy: options.workerId },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          availableAt: exhausted ? job.availableAt : new Date(now.getTime() + retryDelay),
          lockedAt: null,
          lockedBy: null,
          lastError: safeErrorMessage(error),
        },
      });
      if (exhausted) result.failed += 1;
      else result.retried += 1;
    }
  }

  return result;
}

async function failExhaustedStaleJobs(staleBefore: Date, now: Date): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "outbox_jobs"
    SET "status" = 'FAILED',
        "lockedAt" = NULL,
        "lockedBy" = NULL,
        "lastError" = COALESCE("lastError", 'Worker lock expired after final attempt'),
        "updatedAt" = ${now}
    WHERE "status" = 'PROCESSING'
      AND "lockedAt" < ${staleBefore}
      AND "attempts" >= "maxAttempts"
  `;
}

async function claimJobs(
  workerId: string,
  batchSize: number,
  now: Date,
  staleBefore: Date,
): Promise<OutboxJob[]> {
  return prisma.$queryRaw<OutboxJob[]>`
    WITH candidates AS (
      SELECT "id"
      FROM "outbox_jobs"
      WHERE "attempts" < "maxAttempts"
        AND (
          ("status" = 'PENDING' AND "availableAt" <= ${now})
          OR ("status" = 'PROCESSING' AND "lockedAt" < ${staleBefore})
        )
      ORDER BY "availableAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    UPDATE "outbox_jobs" AS jobs
    SET "status" = 'PROCESSING',
        "lockedAt" = ${now},
        "lockedBy" = ${workerId},
        "attempts" = jobs."attempts" + 1,
        "updatedAt" = ${now}
    FROM candidates
    WHERE jobs."id" = candidates."id"
    RETURNING jobs.*
  `;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown job failure';
  return message.replace(/[\r\n\t]+/g, ' ').slice(0, 500);
}
