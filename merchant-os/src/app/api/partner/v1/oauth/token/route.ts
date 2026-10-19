import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { issuePartnerAccessToken } from '@/modules/delivery-partners/services/partner-api-auth';

const credentials = z.object({ client_id: z.string().min(10).max(200), client_secret: z.string().min(24).max(300), grant_type: z.literal('client_credentials') });

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(`partner-token:${getClientIp(request)}`, 20, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
    const contentType = request.headers.get('content-type') ?? '';
    const input = contentType.includes('application/json')
      ? await request.json()
      : Object.fromEntries(new URLSearchParams(await request.text()));
    const data = credentials.parse(input);
    const token = await issuePartnerAccessToken(data.client_id, data.client_secret);
    return Response.json({ access_token: token.accessToken, token_type: 'Bearer', expires_in: token.expiresIn, scope: 'shipping.read_write' });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : error instanceof z.ZodError ? 400 : 500;
    return Response.json({ error: status === 401 ? 'invalid_client' : status === 400 ? 'invalid_request' : 'server_error' }, { status });
  }
}
