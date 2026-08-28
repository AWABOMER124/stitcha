import { NextResponse } from "next/server";
import { handlePartnerWebhook } from "@/modules/delivery-partners/services/partner-integration.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    await handlePartnerWebhook(
      token,
      await request.text(),
      request.headers.get("x-wasla-signature"),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[partner-webhook] processing failed", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 400 });
  }
}
