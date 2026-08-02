import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireAgentAuth } from '@/lib/auth/agent-auth';
import { getMerchantOrderSummary } from '@/modules/agent-integration/services/agent-integration.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { distributorId } = await requireAgentAuth(req, 'orders:read');
    const { id } = await params;
    const summary = await getMerchantOrderSummary(id, distributorId);
    return appData(summary);
  } catch (err) {
    return appError(err);
  }
}
