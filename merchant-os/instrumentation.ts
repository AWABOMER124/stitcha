/**
 * Next.js instrumentation hook — runs once when the server process boots
 * (both `next dev` and `next start`), before any request is handled.
 * Used here to start the in-process subscription-billing cron (see
 * src/modules/finance/services/subscription-billing.service.ts) — this app
 * has no real job queue/scheduler (SyncQueueService is a synchronous stub),
 * so a lightweight node-cron tick inside the same Node process is the
 * pragmatic option rather than standing up separate infrastructure.
 */
export async function register() {
  // Prisma/pg only work in the Node.js runtime, never the Edge runtime this
  // hook can also fire under (e.g. middleware compilation).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const cron = await import('node-cron');
  const { runSubscriptionBilling } = await import('./src/modules/finance/services/subscription-billing.service');

  function runAndLog(trigger: string) {
    runSubscriptionBilling()
      .then((result) => {
        console.log(
          `[subscription-billing] (${trigger}) period ${result.periodFrom.toISOString().slice(0, 10)}..${result.periodTo.toISOString().slice(0, 10)}: ` +
            `${result.billed.length} billed, ${result.skippedAlreadyBilled.length} already billed, ${result.failed.length} failed`
        );
        if (result.failed.length > 0) console.error('[subscription-billing] failures:', result.failed);
      })
      .catch((err) => console.error(`[subscription-billing] (${trigger}) run threw:`, err));
  }

  // Catch up immediately in case the server was down when the 1st rolled over —
  // safe to call redundantly, see runSubscriptionBilling's idempotency note.
  runAndLog('startup');

  // 03:00 UTC on the 1st of every month.
  cron.schedule('0 3 1 * *', () => runAndLog('scheduled'));
}
