/**
 * @module NotificationService
 * @description Central notification orchestration — dispatches to channel-specific
 * providers and logs every notification to the database for audit/analytics.
 */

import type { NotificationChannel, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { NotificationPayload, NotificationProvider } from './types';

export class NotificationService {
  constructor(
    private providers: Map<NotificationChannel, NotificationProvider>,
  ) {}

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  /**
   * Send a notification through the appropriate channel provider and persist it.
   */
  async notify(merchantId: string, payload: NotificationPayload): Promise<void> {
    const provider = this.providers.get(payload.channel);

    if (!provider) {
      console.warn(
        `[NotificationService] No provider registered for channel "${payload.channel}". Skipping.`,
      );
      return;
    }

    try {
      // Dispatch to the channel-specific provider
      await provider.send(payload);

      // Persist to the notification log
      await prisma.notificationLog.create({
        data: {
          merchantId,
          type: payload.type,
          channel: payload.channel,
          recipient: payload.recipient,
          title: payload.title,
          body: payload.body,
          metadata: (payload.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch (error) {
      console.error(
        `[NotificationService] Failed to send ${payload.channel} notification:`,
        error,
      );
      // Don't re-throw — notification failures should not break business flows
    }
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods
  // ---------------------------------------------------------------------------

  /**
   * Notify a merchant user about a new incoming order.
   */
  async notifyNewOrder(
    merchantId: string,
    orderId: string,
    merchantUserId: string,
  ): Promise<void> {
    await this.notify(merchantId, {
      type: 'NEW_ORDER',
      channel: 'IN_APP',
      recipient: merchantUserId,
      title: '🛒 طلب جديد',
      body: `تم استلام طلب جديد #${orderId}. يرجى مراجعته وقبوله.`,
      metadata: { orderId },
    });
  }

  /**
   * Notify a customer about an order status change.
   */
  async notifyOrderStatus(
    merchantId: string,
    orderId: string,
    status: OrderStatus,
    customerPhone: string,
  ): Promise<void> {
    const statusMessages: Record<OrderStatus, string> = {
      NEW: 'تم استلام طلبك بنجاح.',
      ACCEPTED: 'تم قبول طلبك وجاري التحضير.',
      PREPARING: 'جاري تحضير طلبك الآن.',
      READY: 'طلبك جاهز للاستلام!',
      OUT_FOR_DELIVERY: 'طلبك في الطريق إليك.',
      DELIVERED: 'تم توصيل طلبك. شكراً لك!',
      CANCELLED: 'تم إلغاء طلبك.',
      REJECTED: 'عذراً، لم نتمكن من قبول طلبك.',
    };

    await this.notify(merchantId, {
      type: 'ORDER_STATUS',
      channel: 'SMS',
      recipient: customerPhone,
      title: `تحديث الطلب #${orderId}`,
      body: statusMessages[status] || `حالة الطلب: ${status}`,
      metadata: { orderId, status },
    });
  }

  /**
   * Alert merchant staff about low stock levels.
   */
  async notifyLowStock(
    merchantId: string,
    productName: string,
    currentQty: number,
  ): Promise<void> {
    await this.notify(merchantId, {
      type: 'LOW_STOCK',
      channel: 'IN_APP',
      recipient: merchantId, // Broadcast to merchant — all staff see it
      title: '⚠️ مخزون منخفض',
      body: `المنتج "${productName}" وصل إلى ${currentQty} وحدة فقط. يرجى إعادة التوريد.`,
      metadata: { productName, currentQty },
    });
  }
}
