import prisma from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors';
import * as storefrontRepo from '../repositories/storefront.repository';
import type { PlaceOrderInput } from '../schemas/storefront.schemas';
import { nanoid } from 'nanoid';
import { serializePrismaObject } from '@/lib/serialization';

/**
 * Storefront service — public-facing operations.
 */

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
