import { NextResponse } from "next/server";
import { handlePartnerWebhook } from "@/modules/delivery-partners/services/partner-integration.service";
import { AppError } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { ZodError } from 'zod';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const { token } = await params;
    if (!checkRateLimit(`partner-webhook:${token}:${getClientIp(request)}`, 120, 60_000)) {
      return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, requestId }, { status: 429 });
    }
    await handlePartnerWebhook(
      token,
      await request.text(),
      request.headers.get("x-wasla-signature"),
    );
    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("[partner-webhook] processing failed", requestId, error);
    const status = error instanceof ZodError ? 422 : error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof ZodError ? 'INVALID_PAYLOAD' : error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = status >= 500 ? 'Processing failed' : error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ success: false, error: { code, message }, requestId }, { status });
  }
}
