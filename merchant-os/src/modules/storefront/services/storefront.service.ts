import prisma from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors';
import * as storefrontRepo from '../repositories/storefront.repository';
import type { PlaceOrderInput } from '../schemas/storefront.schemas';
import { nanoid } from 'nanoid';
import { serializePrismaObject } from '@/lib/serialization';
import type { CustomerAccount, OrderStatus, Prisma } from '@prisma/client';
import * as notificationsService from '@/modules/notifications/services/notifications.service';

/**
 * Storefront service — public-facing operations.
 */

/** Alerts the merchant (in-app bell) that a new order landed from their public storefront.
 * Best-effort — a notification failure shouldn't fail the checkout itself. */
async function notifyMerchantNewOrder(merchantId: string, orderNumber: string, customerName: string, total: number) {
  try {
    await notificationsService.sendNotification(merchantId, {
      type: 'NEW_ORDER',
      channel: 'IN_APP',
      recipient: merchantId,
      title: 'طلب جديد',
      body: `طلب ${orderNumber} من ${customerName} بقيمة ${total.toLocaleString()} SDG`,
    });
  } catch {
    // Notification is a side-effect, not part of the checkout contract.
  }
}

export const getMerchantBySlug = storefrontRepo.getMerchantBySlug;
export const getCategoriesForStore = storefrontRepo.getCategories;
export const getProductsForStore = (merchantId: string) =>
  storefrontRepo.getProducts(merchantId);

/** Get full store data by slug */
export async function getStoreData(slug: string) {
  const merchant = await storefrontRepo.getMerchantBySlug(slug);
  if (!merchant) throw new NotFoundError('Store', `Store "${slug}" not found`);

  const categories = await storefrontRepo.getCategories(merchant.id);
  return { merchant, categories };
}

/** Get store products, optionally filtered */
export async function getStoreProducts(slug: string, categorySlug?: string, search?: string) {
  const merchant = await storefrontRepo.getMerchantBySlug(slug);
  if (!merchant) throw new NotFoundError('Store');

  let categoryId: string | undefined;
  if (categorySlug) {
    const cat = await prisma.category.findFirst({
      where: { merchantId: merchant.id, slug: categorySlug, isActive: true },
    });
    categoryId = cat?.id;
  }

  return storefrontRepo.getProducts(merchant.id, categoryId, search);
}

/** Get single product by slug */
export async function getStoreProduct(slug: string, productSlug: string) {
  const merchant = await storefrontRepo.getMerchantBySlug(slug);
  if (!merchant) throw new NotFoundError('Store');

  const product = await storefrontRepo.getProduct(merchant.id, productSlug);
  if (!product) throw new NotFoundError('Product');

  return product;
}

/** Place order from public storefront */
export async function placeOrder(slug: string, data: PlaceOrderInput) {
  const merchant = await storefrontRepo.getMerchantBySlug(slug);
  if (!merchant) throw new NotFoundError('Store');

  const settings = merchant.storefrontSettings;
  if (settings && !settings.isOpen) {
    throw new ValidationError('Store is currently closed');
  }

  // Validate products
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId: merchant.id, isActive: true },
  });

  if (products.length !== productIds.length) {
    throw new ValidationError('Some products are unavailable');
  }

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { merchantId: merchant.id, phone: data.customerPhone },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { merchantId: merchant.id, name: data.customerName, phone: data.customerPhone },
    });
  }

  // Build order
  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  const orderItems = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.price);
    const total = unitPrice * item.quantity;
    subtotal += total;
    return {
      productId: product.id,
      productSnapshot: { name: product.name, price: unitPrice, image: (product.images as string[])?.[0] ?? null },
      quantity: item.quantity,
      unitPrice,
      total,
    };
  });

  // Check minimum order
  if (settings && Number(settings.minimumOrderAmount) > subtotal) {
    throw new ValidationError(`Minimum order amount is ${settings.minimumOrderAmount} SDG`);
  }

  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      orderNumber,
      customerId: customer.id,
      status: 'NEW',
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      deliveryMethod: data.deliveryMethod,
      paymentMethod: 'CASH',
      notes: data.notes,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      items: { create: orderItems },
      statusHistory: { create: { status: 'NEW', note: 'Order placed from storefront' } },
    },
    include: { items: true },
  });

  // Update customer stats
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: subtotal },
    },
  });

  await notifyMerchantNewOrder(merchant.id, order.orderNumber, data.customerName, subtotal);

  return { orderId: order.id, orderNumber: order.orderNumber };
}

/** Get order status for public tracking */
export async function getOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, orderNumber: true, status: true, total: true, subtotal: true,
      deliveryFee: true, deliveryMethod: true, createdAt: true,
      items: {
        select: { productSnapshot: true, quantity: true, unitPrice: true, total: true },
      },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) throw new NotFoundError('Order');
  return serializePrismaObject(order);
}

// ============================================================================
// Mobile app (Flutter) — customer-account-scoped operations
// ============================================================================

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: 'مطعم',
  CAFE: 'مقهى',
  GROCERY: 'بقالة',
  PHARMACY: 'صيدلية',
  RETAIL: 'متجر',
  OTHER: 'أخرى',
};

// No ratings system or per-location delivery quote exists yet. Keep these
// values absent so the app never presents an estimate as confirmed pricing.

type MerchantForApp = {
  id: string;
  name: string;
  logo: string | null;
  coverImage: string | null;
  businessType: string;
  isFeatured?: boolean;
};

function mapMerchantForApp(merchant: MerchantForApp) {
  return {
    id: merchant.id,
    name: merchant.name,
    category: BUSINESS_TYPE_LABELS[merchant.businessType] ?? merchant.businessType,
    imageUrl: merchant.logo ?? merchant.coverImage ?? null,
    rating: null as number | null,
    deliveryTime: null,
    deliveryFee: null,
    isFeatured: merchant.isFeatured ?? false,
  };
}

/** Store list for the app's home screen */
export async function listStoresForApp() {
  const merchants = await storefrontRepo.listActiveMerchants();
  return merchants.map(mapMerchantForApp);
}

/** Single store detail for the app */
export async function getStoreForApp(id: string) {
  const merchant = await storefrontRepo.getMerchantById(id);
  if (!merchant) throw new NotFoundError('Store');
  return mapMerchantForApp(merchant);
}

type ProductForApp = {
  id: string;
  name: string;
  description: string | null;
  images: unknown;
  price: Prisma.Decimal | number;
  category: { name: string } | null;
};

function mapProductForApp(product: ProductForApp, storeId: string) {
  const images = product.images as string[] | null;
  return {
    id: product.id,
    storeId,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    imageUrl: images?.[0] ?? null,
    category: product.category?.name ?? null,
  };
}

/** Product list for the app's store-detail screen */
export async function getStoreProductsForApp(storeId: string) {
  const merchant = await storefrontRepo.getMerchantById(storeId);
  if (!merchant) throw new NotFoundError('Store');
  const products = await storefrontRepo.getProducts(storeId);
  return products.map((p) => mapProductForApp(p, storeId));
}

/** Maps the internal order-lifecycle enum to the small status vocabulary the
 * Flutter app's tracking/history screens actually switch on. CANCELLED/REJECTED
 * map to 'cancelled', a 5th value the app doesn't explicitly branch on yet —
 * it degrades to the same default rendering as an unrecognized status. */
export function mapOrderStatusForApp(status: OrderStatus): string {
  switch (status) {
    case 'NEW':
    case 'ACCEPTED':
      return 'pending';
    case 'PREPARING':
    case 'READY':
      return 'preparing';
    case 'OUT_FOR_DELIVERY':
      return 'delivering';
    case 'DELIVERED':
      return 'completed';
    case 'CANCELLED':
    case 'REJECTED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

type OrderForApp = {
  id: string;
  status: OrderStatus;
  total: unknown;
  createdAt: Date;
  customerAddress: string | null;
  merchant: { name: string };
};

function mapOrderForApp(order: OrderForApp) {
  return {
    id: order.id,
    status: mapOrderStatusForApp(order.status),
    totalAmount: Number(order.total),
    date: order.createdAt,
    address: order.customerAddress,
    storeName: order.merchant.name,
  };
}

export interface MobileOrderInput {
  items: { productId: string; quantity: number }[];
  address?: string;
  paymentMethod?: string;
  notes?: string;
}

/** Places an order on behalf of an authenticated CustomerAccount (mobile app).
 * Infers the merchant from the cart's products — a single order can only
 * belong to one merchant, matching the existing single-slug placeOrder(). */
export async function placeOrderForAccount(account: CustomerAccount, data: MobileOrderInput) {
  if (data.items.length === 0) throw new ValidationError('السلة فارغة');

  if (data.paymentMethod && data.paymentMethod.toUpperCase() !== 'CASH') {
    throw new ValidationError('طريقة الدفع غير مدعومة حالياً — الدفع نقداً عند الاستلام فقط');
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== productIds.length) {
    throw new ValidationError('بعض المنتجات غير متوفرة');
  }

  const merchantIds = new Set(products.map((p) => p.merchantId));
  if (merchantIds.size > 1) {
    throw new ValidationError('لا يمكن الطلب من أكثر من متجر واحد في نفس الوقت');
  }
  const merchantId = products[0].merchantId;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId, isActive: true, status: 'ACTIVE' },
    include: { storefrontSettings: true },
  });
  if (!merchant) throw new NotFoundError('Store');
  if (merchant.storefrontSettings && !merchant.storefrontSettings.isOpen) {
    throw new ValidationError('المتجر مغلق حالياً');
  }

  let customer = await prisma.customer.findFirst({
    where: { merchantId, phone: account.phone },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { merchantId, name: account.name, phone: account.phone, accountId: account.id },
    });
  } else if (!customer.accountId) {
    customer = await prisma.customer.update({ where: { id: customer.id }, data: { accountId: account.id } });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  const orderItems = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.price);
    const total = unitPrice * item.quantity;
    subtotal += total;
    return {
      productId: product.id,
      productSnapshot: { name: product.name, price: unitPrice, image: (product.images as string[])?.[0] ?? null },
      quantity: item.quantity,
      unitPrice,
      total,
    };
  });

  if (merchant.storefrontSettings && Number(merchant.storefrontSettings.minimumOrderAmount) > subtotal) {
    throw new ValidationError(`الحد الأدنى للطلب هو ${merchant.storefrontSettings.minimumOrderAmount} SDG`);
  }

  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
  const order = await prisma.order.create({
    data: {
      merchantId,
      orderNumber,
      customerId: customer.id,
      status: 'NEW',
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      deliveryMethod: 'MERCHANT_DELIVERY',
      paymentMethod: 'CASH',
      notes: data.notes,
      customerName: account.name,
      customerPhone: account.phone,
      customerAddress: data.address,
      items: { create: orderItems },
      statusHistory: { create: { status: 'NEW', note: 'Order placed from mobile app' } },
    },
    include: { merchant: { select: { name: true } } },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { totalOrders: { increment: 1 }, totalSpent: { increment: subtotal } },
  });

  await notifyMerchantNewOrder(merchantId, order.orderNumber, account.name, subtotal);

  return mapOrderForApp(order);
}

/** Order history for an authenticated CustomerAccount, across all merchants. */
export async function getOrderHistoryForAccount(accountId: string) {
  const orders = await prisma.order.findMany({
    where: { customer: { accountId } },
    include: { merchant: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(mapOrderForApp);
}
