import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireAgentAuth } from '@/lib/auth/agent-auth';
import { getStoreDraft } from '@/modules/agent-integration/services/agent-integration.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { distributorId } = await requireAgentAuth(req, 'stores:draft');
    const { id } = await params;
    const draft = await getStoreDraft(id, distributorId);
    return appData(draft);
  } catch (err) {
    return appError(err);
  }
}
