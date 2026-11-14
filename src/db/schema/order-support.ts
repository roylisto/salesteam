import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, numeric, pgTable, primaryKey, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./auth";
import { orders, invoices } from "./orders";
import { salesInventory } from "./inventory";

export const orderCounters = pgTable("order_counters", {
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  kind: varchar("kind", { length: 10 }).notNull(),
  lastNumber: bigint("last_number", { mode: "bigint" }).default(sql`0`).notNull(),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.organizationId, t.kind] })]);

/** Immutable base-unit allocations; order status determines reserved/delivered/released. */
export const orderStockAllocations = pgTable("order_stock_allocations", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
  salesInventoryId: bigint("sales_inventory_id", { mode: "number" }).notNull().references(() => salesInventory.id),
  quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("order_stock_allocation_unique").on(t.orderId, t.salesInventoryId), index("order_allocation_org_idx").on(t.organizationId)]);

export const orderPayments = pgTable("order_payments", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull().references(() => invoices.id),
  transactionNumber: varchar("transaction_number", { length: 60 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  method: varchar("method", { length: 60 }).notNull(),
  reference: varchar("reference", { length: 150 }),
  requestKey: varchar("request_key", { length: 36 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  createdById: bigint("created_by_id", { mode: "number" }).notNull().references(() => users.id),
  ...timestamps,
}, (t) => [uniqueIndex("order_payment_request_unique").on(t.organizationId, t.requestKey),
  uniqueIndex("order_payment_number_unique").on(t.organizationId, t.transactionNumber), index("order_payment_order_idx").on(t.orderId)]);

export const printerSettings = pgTable("printer_settings", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  paper: varchar("paper", { length: 10 }).default("80").notNull(),
  width: integer("width").default(80).notNull(),
  margin: integer("margin").default(3).notNull(),
  fontSize: integer("font_size").default(11).notNull(),
  template: varchar("template", { length: 15 }).default("compact").notNull(),
  header: varchar("header", { length: 200 }).default("").notNull(),
  footer: text("footer").default("Terima kasih atas kepercayaan Anda.").notNull(),
  showLogo: boolean("show_logo").default(true).notNull(),
  showSku: boolean("show_sku").default(true).notNull(),
  showAddress: boolean("show_address").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("printer_settings_org_unique").on(t.organizationId)]);
