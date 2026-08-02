import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireAgentAuth } from '@/lib/auth/agent-auth';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { submitStoreDraftSchema } from '@/modules/agent-integration/schemas/agent-integration.schemas';
import { createStoreDraft, listStoreDrafts } from '@/modules/agent-integration/services/agent-integration.service';
import { ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const { distributorId, apiKeyId } = await requireAgentAuth(req, 'stores:draft');
    // 30 drafts / hour per key — generous for a legitimate onboarding agent, cheap to raise on request.
    enforceRateLimit(`agent-store-draft:${apiKeyId}`, 30, 60 * 60_000);

    const body = await req.json();
    const parsed = submitStoreDraftSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid draft payload');

    const draft = await createStoreDraft(distributorId, apiKeyId, parsed.data);
    return appData(draft, 201);
  } catch (err) {
    return appError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { distributorId } = await requireAgentAuth(req, 'stores:draft');
    const drafts = await listStoreDrafts(distributorId);
    return appData(drafts);
  } catch (err) {
    return appError(err);
  }
}
