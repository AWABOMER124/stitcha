import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { getStoreForApp } from '@/modules/storefront/services/storefront.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = await getStoreForApp(id);
    return appData(store);
  } catch (err) {
    return appError(err);
  }
}
