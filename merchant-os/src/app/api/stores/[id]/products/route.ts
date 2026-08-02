import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { getStoreProductsForApp } from '@/modules/storefront/services/storefront.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const products = await getStoreProductsForApp(id);
    return appData(products);
  } catch (err) {
    return appError(err);
  }
}
