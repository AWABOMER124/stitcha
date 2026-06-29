/**
 * Inventory Module — Public API
 */

export {
  getInventoryAction,
  getProductStockAction,
  adjustStockAction,
  updateThresholdAction,
  getLowStockAlertsAction,
} from './actions';

export {
  getInventory,
  getProductStock,
  adjustStock,
  getLowStockAlerts,
  deductForOrder,
  restoreForCancellation,
  getMovements,
  updateThreshold,
} from './services/inventory.service';

export {
  adjustStockSchema,
  updateThresholdSchema,
  inventoryFilterSchema,
} from './schemas/inventory.schemas';

export type { InventoryItemWithProduct, LowStockAlert } from './types';
export type { AdjustStockInput, UpdateThresholdInput, InventoryFilterInput } from './schemas/inventory.schemas';
