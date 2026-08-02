import { appData, appError } from '@/lib/http/app-response';
import { listStoresForApp } from '@/modules/storefront/services/storefront.service';

export async function GET() {
  try {
    const stores = await listStoresForApp();
    return appData(stores);
  } catch (err) {
    return appError(err);
  }
}
