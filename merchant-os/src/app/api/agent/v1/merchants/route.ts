import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireAgentAuth } from '@/lib/auth/agent-auth';
import { listDistributorMerchants } from '@/modules/agent-integration/services/agent-integration.service';

export async function GET(req: NextRequest) {
  try {
    const { distributorId } = await requireAgentAuth(req, 'merchants:read');
    const merchants = await listDistributorMerchants(distributorId);
    return appData(merchants);
  } catch (err) {
    return appError(err);
  }
}
