import { isNull } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { products, warehouses } from "./master-data";
import { users } from "./auth";
import {
  salesStockStatusEnum,
  salesStockTypeEnum,
  stockMovementStatusEnum,
  stockMovementTypeEnum,
} from "./enums";

/**
 * Warehouse stock movement header (transfer in / out between warehouses).
 * High-volume append-only table — indexed by organization + date for reporting.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transactionDate: date("transaction_date"),
    transactionNumber: varchar("transaction_number", { length: 60 }),
    referenceNumber: varchar("reference_number", { length: 60 }),
    sourceWarehouseId: bigint("source_warehouse_id", { mode: "number" }).references(
      () => warehouses.id,
      { onDelete: "set null" },
    ),
    destinationWarehouseId: bigint("destination_warehouse_id", {
      mode: "number",
    }).references(() => warehouses.id, { onDelete: "set null" }),
    type: stockMovementTypeEnum("type").notNull(),
    status: stockMovementStatusEnum("status").default("draft").notNull(),
    inputById: bigint("input_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    index("stock_movements_organization_date_idx").on(
      table.organizationId,
      table.transactionDate,
    ),
    index("stock_movements_status_idx").on(table.status),
    index("stock_movements_transaction_number_idx").on(table.transactionNumber),
  ],
);

/** Line items of a warehouse stock movement. */
export const stockMovementItems = pgTable(
  "stock_movement_items",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stockMovementId: bigint("stock_movement_id", { mode: "number" })
      .notNull()
      .references(() => stockMovements.id, { onDelete: "cascade" }),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("stock_movement_items_movement_idx").on(table.stockMovementId),
    index("stock_movement_items_organization_idx").on(table.organizationId),
  ],
);

/** Sales stock in/out transaction header. */
export const salesStocks = pgTable(
  "sales_stocks",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transactionDate: date("transaction_date").notNull(),
    transactionNumber: varchar("transaction_number", { length: 60 }).notNull(),
    salesId: bigint("sales_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    warehouseId: bigint("warehouse_id", { mode: "number" })
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    type: salesStockTypeEnum("type").notNull(),
    status: salesStockStatusEnum("status").default("draft").notNull(),
    inputById: bigint("input_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    index("sales_stocks_organization_date_idx").on(
      table.organizationId,
      table.transactionDate,
    ),
    index("sales_stocks_sales_idx").on(table.salesId),
    index("sales_stocks_status_idx").on(table.status),
  ],
);

/** Line items of a sales stock transaction. */
export const salesStockItems = pgTable(
  "sales_stock_items",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    salesStockId: bigint("sales_stock_id", { mode: "number" })
      .notNull()
      .references(() => salesStocks.id, { onDelete: "cascade" }),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (table) => [
    index("sales_stock_items_stock_idx").on(table.salesStockId),
    index("sales_stock_items_organization_idx").on(table.organizationId),
  ],
);

/** Current stock held by each sales rep (aggregate, one row per sales+product). */
export const salesInventory = pgTable(
  "sales_inventory",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    salesId: bigint("sales_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sales_inventory_sales_product_unique")
      .on(table.salesId, table.productId)
      .where(isNull(table.deletedAt)),
    index("sales_inventory_organization_idx").on(table.organizationId),
  ],
);
