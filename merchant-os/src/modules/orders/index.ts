/**
 * Orders Module — Public API
 */

export {
  getOrdersAction,
  getOrderAction,
  createOrderAction,
  updateOrderStatusAction,
  getTodayOverviewAction,
} from './actions';

export {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  getTodayOverview,
} from './services/orders.service';

export {
  createOrderSchema,
  updateOrderStatusSchema,
  orderFilterSchema,
} from './schemas/orders.schemas';

export type { OrderFull, ProductSnapshot, TodayOverview, StatusTransitionMap } from './types';
export type { CreateOrderInput, UpdateOrderStatusInput, OrderFilterInput } from './schemas/orders.schemas';
