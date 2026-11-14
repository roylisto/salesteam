import { isNull, sql } from "drizzle-orm";
import {
  bigint,
  date,
  check,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
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
    requestKey: varchar("request_key", { length: 36 }),
    requestHash: varchar("request_hash", { length: 64 }),
    reversalOfId: bigint("reversal_of_id", { mode: "number" }).references(
      (): AnyPgColumn => stockMovements.id,
    ),
    replacementOfId: bigint("replacement_of_id", { mode: "number" }).references(
      (): AnyPgColumn => stockMovements.id,
    ),
    correctionReason: text("correction_reason"),
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
    uniqueIndex("stock_movements_request_unique").on(table.organizationId, table.requestKey),
    uniqueIndex("stock_movements_org_number_unique").on(table.organizationId, table.transactionNumber),
    index("stock_movements_reversal_idx").on(table.reversalOfId),
    uniqueIndex("stock_movements_replacement_unique").on(table.replacementOfId),
    check("stock_movements_one_correction_kind", sql`${table.reversalOfId} is null or ${table.replacementOfId} is null`),
  ],
);

/** Transactional counter per tenant, warehouse and movement direction. */
export const stockMovementCounters = pgTable("stock_movement_counters", {
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  warehouseId: bigint("warehouse_id", { mode: "number" }).notNull().references(() => warehouses.id),
  type: stockMovementTypeEnum("type").notNull(),
  lastNumber: bigint("last_number", { mode: "bigint" }).default(sql`0`).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.organizationId, table.warehouseId, table.type] }),
]);

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
    quantity: numeric("quantity", { precision: 20, scale: 6 }).default("0").notNull(),
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
    referenceNumber: varchar("reference_number", { length: 60 }),
    requestKey: varchar("request_key", { length: 36 }),
    requestHash: varchar("request_hash", { length: 64 }),
    warehouseMovementId: bigint("warehouse_movement_id", { mode: "number" }).references(() => stockMovements.id),
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
    uniqueIndex("sales_stocks_request_unique").on(table.organizationId, table.requestKey),
    uniqueIndex("sales_stocks_org_number_unique").on(table.organizationId, table.transactionNumber),
    uniqueIndex("sales_stocks_warehouse_movement_unique").on(table.warehouseMovementId),
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
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("sales_stock_items_stock_idx").on(table.salesStockId),
    index("sales_stock_items_organization_idx").on(table.organizationId),
  ],
);

/** Sales stock by SKU and origin warehouse. Null origins preserve legacy balances. */
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
    warehouseId: bigint("warehouse_id", { mode: "number" }).references(() => warehouses.id),
    reservedQuantity: numeric("reserved_quantity", { precision: 20, scale: 6 }).default("0").notNull(),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).default("0").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sales_inventory_sales_product_origin_unique")
      .on(table.salesId, table.productId, sql`coalesce(${table.warehouseId}, 0)`)
      .where(isNull(table.deletedAt)),
    index("sales_inventory_organization_idx").on(table.organizationId),
  ],
);

export const salesStockCounters = pgTable("sales_stock_counters", {
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  salesId: bigint("sales_id", { mode: "number" }).notNull().references(() => users.id),
  type: salesStockTypeEnum("type").notNull(),
  lastNumber: bigint("last_number", { mode: "bigint" }).default(sql`0`).notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.organizationId, table.salesId, table.type] })]);
