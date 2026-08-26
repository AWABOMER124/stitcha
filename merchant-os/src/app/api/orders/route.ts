import { NextRequest } from 'next/server';
import { appData, appError } from '@/lib/http/app-response';
import { requireCustomerAuth } from '@/lib/auth/customer-session';
import { placeOrderForAccount, type MobileOrderInput } from '@/modules/storefront/services/storefront.service';
import { ValidationError } from '@/lib/errors';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

/** Raw request shape the Flutter app sends — snake_case field names kept
 * as-is on the wire, translated here rather than in the service layer. */
interface MobileOrderRequestBody {
  items?: { product_id?: string; qty?: number }[];
  address?: string;
  payment_method?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 20 orders / min per IP — matches the roadmap's public-API rate limit table.
    enforceRateLimit(`place-order:${getClientIp(req)}`, 20, 60_000);

    const account = await requireCustomerAuth(req);
    const body = (await req.json()) as MobileOrderRequestBody;

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new ValidationError('السلة فارغة');
    }

    const input: MobileOrderInput = {
      items: body.items.map((item) => {
        const quantity = item.qty;
        if (!item.product_id || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
          throw new ValidationError('عنصر غير صالح في السلة');
        }
        return { productId: item.product_id, quantity };
      }),
      address: body.address,
      paymentMethod: body.payment_method,
      notes: body.notes,
    };

    const order = await placeOrderForAccount(account, input);
    return appData(order, 201);
  } catch (err) {
    return appError(err);
  }
}
