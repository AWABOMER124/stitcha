import { NextResponse } from 'next/server';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { buildMerchantExport, EXPORT_TYPES, type ExportType } from '@/modules/exports/exports.service';
import { requireMerchantEntitlement } from '@/modules/merchant-subscriptions';

export const runtime = 'nodejs';

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request, context: RouteContext<'/api/exports/[type]'>) {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'exports:download');
    await requireMerchantEntitlement(auth.merchantId, 'dataExport', 'تصدير البيانات متاح في باقة Pro');
    const { type } = await context.params;
    if (!EXPORT_TYPES.includes(type as ExportType)) return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
    const url = new URL(request.url);
    const from = parseDate(url.searchParams.get('from'));
    const to = parseDate(url.searchParams.get('to'), true);
    const result = await buildMerchantExport(auth.merchantId, type as ExportType, from, to);
    const day = new Date().toISOString().slice(0, 10);
    const filename = `wasla-${type}-${day}.xlsx`;
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
        'X-Export-Row-Count': String(result.count),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    const status = message.includes('logged in') ? 401 : message.includes('permission') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
