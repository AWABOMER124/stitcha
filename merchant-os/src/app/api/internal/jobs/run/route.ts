import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runScheduledJobs } from '@/services/jobs/job-runner';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.JOB_RUNNER_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'Job runner is not configured' },
      { status: 503 },
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  const provided = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!safeSecretEqual(secret, provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runScheduledJobs();
  return NextResponse.json({ ok: true, result });
}

function safeSecretEqual(expected: string, provided: string): boolean {
  const expectedDigest = createHash('sha256').update(expected).digest();
  const providedDigest = createHash('sha256').update(provided).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}
