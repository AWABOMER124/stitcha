-- Products created by the early merchant form received a zero-stock inventory
-- record although the merchant was never asked to configure stock. They were
-- therefore impossible to buy. Preserve deliberately managed inventory: only
-- disable tracking for untouched, zero-quantity records with no movements.
UPDATE "inventory_items" AS ii
SET "trackInventory" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE ii."trackInventory" = true
  AND ii."quantity" = 0
  AND ii."reservedQuantity" = 0
  AND NOT EXISTS (
    SELECT 1 FROM "stock_movements" AS sm WHERE sm."inventoryItemId" = ii."id"
  );
