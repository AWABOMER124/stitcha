import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import * as whatsappChannelService from '@/modules/whatsapp-channel/services/whatsapp-channel.service';
import * as ordersService from '@/modules/orders/services/orders.service';

/**
 * Numbered-menu WhatsApp ordering bot — an MVP, not full NLP. A customer
 * texts a trigger word to start; every subsequent step is "reply with a
 * number" against a menu the bot just sent. State lives in
 * Conversation.orderContext (see prisma/schema.prisma) so it survives
 * across separate inbound webhook calls.
 *
 * Deliberately opt-in per message: if there's no context AND the message
 * isn't a trigger word, this does nothing — the message is left exactly as
 * it was before this module existed (just logged to the inbox for a human
 * to see). Existing merchants who never mention this get no behavior change.
 */

const MENU_TRIGGERS = ['قائمة', 'menu', 'طلب', 'ابدأ', 'start'];
const CANCEL_COMMANDS = ['إلغاء', 'الغاء', 'cancel', 'خروج'];
const DONE_COMMANDS = ['إنهاء', 'انهاء', 'تم', 'done', 'checkout'];

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderFlowContext {
  state: 'AWAITING_CATEGORY' | 'AWAITING_PRODUCT' | 'AWAITING_ADDRESS';
  categoryIds?: string[];
  categoryId?: string;
  productIds?: string[];
  cart: CartLine[];
}

export function isMenuTrigger(text: string): boolean {
  return MENU_TRIGGERS.includes(text.trim().toLowerCase());
}

export function isCancelCommand(text: string): boolean {
  return CANCEL_COMMANDS.includes(text.trim().toLowerCase());
}

export function isDoneCommand(text: string): boolean {
  return DONE_COMMANDS.includes(text.trim().toLowerCase());
}

/** A positive integer typed as a menu choice, or null if the text isn't one. */
export function parseNumberChoice(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n > 0 ? n : null;
}

export function formatCategoryMenu(categories: { name: string }[]): string {
  const lines = categories.map((c, i) => `${i + 1}. ${c.name}`);
  return `اختر فئة بالرد برقمها:\n${lines.join('\n')}\n\nرد "إلغاء" للخروج في أي وقت.`;
}

export function formatProductMenu(products: { name: string; price: number }[], cart: CartLine[]): string {
  const lines = products.map((p, i) => `${i + 1}. ${p.name} — ${p.price.toLocaleString('en-US')} SDG`);
  const cartSummary = cart.length
    ? `سلتك الآن: ${cart.map((c) => `${c.name} × ${c.quantity}`).join('، ')}\n\n`
    : '';
  return (
    `${cartSummary}اختر منتجاً بالرد برقمه لإضافته للسلة:\n${lines.join('\n')}\n\n` +
    `رد "قائمة" للرجوع للفئات، "إنهاء" لإتمام الطلب، أو "إلغاء" للخروج.`
  );
}

async function reply(merchantId: string, to: string, text: string): Promise<void> {
  const result = await whatsappChannelService.sendMessage(merchantId, to, text);
  if (!result.success) console.error('[whatsapp-ordering] failed to send reply:', result.error);
}

async function setContext(conversationId: string, context: OrderFlowContext | null): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { orderContext: context as unknown as Prisma.InputJsonValue | undefined },
  });
}

async function showCategories(merchantId: string, conversationId: string, customerPhone: string, cart: CartLine[]): Promise<void> {
  const categories = await prisma.category.findMany({
    where: { merchantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (categories.length === 0) {
    await reply(merchantId, customerPhone, 'عذراً، لا توجد فئات متاحة حالياً في هذا المتجر.');
    return;
  }
  await setContext(conversationId, { state: 'AWAITING_CATEGORY', categoryIds: categories.map((c) => c.id), cart });
  await reply(merchantId, customerPhone, formatCategoryMenu(categories));
}

async function showProducts(
  merchantId: string,
  conversationId: string,
  customerPhone: string,
  categoryId: string,
  cart: CartLine[]
): Promise<void> {
  const products = await prisma.product.findMany({
    where: { merchantId, categoryId, isActive: true },
    select: { id: true, name: true, price: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (products.length === 0) {
    await reply(merchantId, customerPhone, 'لا توجد منتجات في هذه الفئة حالياً. رد "قائمة" للرجوع.');
    return;
  }
  await setContext(conversationId, { state: 'AWAITING_PRODUCT', categoryId, productIds: products.map((p) => p.id), cart });
  await reply(merchantId, customerPhone, formatProductMenu(products.map((p) => ({ name: p.name, price: Number(p.price) })), cart));
}

async function createOrderFromCart(
  merchantId: string,
  phone: string,
  name: string,
  address: string,
  cart: CartLine[],
  deliveryLocation?: { lat: number; lng: number },
) {
  return ordersService.createOrder(merchantId, {
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    deliveryLat: deliveryLocation?.lat,
    deliveryLng: deliveryLocation?.lng,
    deliveryMethod: 'MERCHANT_DELIVERY',
    paymentMethod: 'CASH',
    notes: 'Order placed via WhatsApp bot',
    items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
  });
}

export interface InboundMessageParams {
  merchantId: string;
  conversationId: string;
  customerName: string | null;
  customerPhone: string;
  text: string;
  deliveryLocation?: { lat: number; lng: number };
}

export async function handleInboundMessage(params: InboundMessageParams): Promise<boolean> {
  const { merchantId, conversationId, customerPhone } = params;
  const text = params.text.trim();
  if (!text) return false;

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { orderContext: true } });
  const context = (conv?.orderContext as unknown as OrderFlowContext | null) ?? null;

  if (isCancelCommand(text)) {
    if (context) {
      await setContext(conversationId, null);
      await reply(merchantId, customerPhone, 'تم إلغاء الطلب. اكتب "قائمة" لبدء طلب جديد في أي وقت.');
    }
    return Boolean(context);
  }

  if (!context) {
    if (isMenuTrigger(text)) {
      await showCategories(merchantId, conversationId, customerPhone, []);
      return true;
    }
    return false; // Not an ordering interaction — leave for a human or the opt-in AI agent.
  }

  if (context.state === 'AWAITING_CATEGORY') {
    const n = parseNumberChoice(text);
    const categoryIds = context.categoryIds ?? [];
    if (n === null || n < 1 || n > categoryIds.length) {
      await reply(merchantId, customerPhone, `رد برقم صحيح من 1 إلى ${categoryIds.length}، أو "إلغاء" للخروج.`);
      return true;
    }
    await showProducts(merchantId, conversationId, customerPhone, categoryIds[n - 1], context.cart);
    return true;
  }

  if (context.state === 'AWAITING_PRODUCT') {
    if (isMenuTrigger(text)) {
      await showCategories(merchantId, conversationId, customerPhone, context.cart);
      return true;
    }
    if (isDoneCommand(text)) {
      if (context.cart.length === 0) {
        await reply(merchantId, customerPhone, 'سلتك فارغة — رد برقم منتج لإضافته أولاً.');
        return true;
      }
      await setContext(conversationId, { state: 'AWAITING_ADDRESS', cart: context.cart });
      const total = context.cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
      await reply(merchantId, customerPhone, `الإجمالي المبدئي: ${total.toLocaleString('en-US')} SDG\n\nمن فضلك أرسل موقعك من زر الموقع في واتساب للتوصيل الدقيق، أو اكتب عنوان التوصيل الكامل:`);
      return true;
    }

    const n = parseNumberChoice(text);
    const productIds = context.productIds ?? [];
    if (n === null || n < 1 || n > productIds.length) {
      await reply(merchantId, customerPhone, `رد برقم صحيح من 1 إلى ${productIds.length}، "قائمة" للفئات، أو "إنهاء" لإتمام الطلب.`);
      return true;
    }

    const productId = productIds[n - 1];
    const product = await prisma.product.findFirst({ where: { id: productId, merchantId, isActive: true }, select: { id: true, name: true, price: true } });
    if (!product) {
      await reply(merchantId, customerPhone, 'هذا المنتج لم يعد متاحاً. رد "قائمة" للرجوع.');
      return true;
    }

    const cart = [...context.cart];
    const existingLine = cart.find((line) => line.productId === productId);
    if (existingLine) existingLine.quantity += 1;
    else cart.push({ productId: product.id, name: product.name, price: Number(product.price), quantity: 1 });

    await showProducts(merchantId, conversationId, customerPhone, context.categoryId!, cart);
    return true;
  }

  if (context.state === 'AWAITING_ADDRESS') {
    if (text.length < 3) {
      await reply(merchantId, customerPhone, 'من فضلك أرسل عنواناً تفصيلياً صحيحاً.');
      return true;
    }
    try {
      const order = await createOrderFromCart(merchantId, customerPhone, params.customerName ?? customerPhone, text, context.cart, params.deliveryLocation);
      await setContext(conversationId, null);
      await reply(
        merchantId,
        customerPhone,
        `تم استلام طلبك رقم ${order.orderNumber} بقيمة ${Number(order.total).toLocaleString('en-US')} SDG شاملة رسوم التوصيل. الدفع نقداً عند الاستلام، وسيتواصل معك المتجر لتأكيد التفاصيل.`,
      );
    } catch (err) {
      console.error('[whatsapp-ordering] order creation failed:', err);
      await reply(merchantId, customerPhone, 'حدث خطأ أثناء إنشاء طلبك — حاول مرة أخرى أو تواصل معنا مباشرة.');
    }
    return true;
  }
  return false;
}
