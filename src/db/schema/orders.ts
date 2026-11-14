import { isNull } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { outlets, products, warehouses } from "./master-data";
import { users } from "./auth";
import { invoiceStatusEnum } from "./enums";
import { productSellUnits } from "./product-pricing";

/** Sales order placed by a sales rep at an outlet. */
export const orders = pgTable(
  "orders",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    outletId: bigint("outlet_id", { mode: "number" })
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    salesId: bigint("sales_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    warehouseId: bigint("warehouse_id", { mode: "number" }).references(
      () => warehouses.id,
      { onDelete: "set null" },
    ),
    transactionNumber: varchar("transaction_number", { length: 60 }),
    referenceNumber: varchar("reference_number", { length: 60 }),
    quotationNumber: varchar("quotation_number", { length: 60 }),
    requestKey: varchar("request_key", { length: 36 }),
    requestHash: varchar("request_hash", { length: 64 }),
    notes: text("notes"),
    snapshot: jsonb("snapshot").$type<{
      customer: string; address: string; sales: string; warehouse: string; area: string;
      company: string; companyAddress: string; phone: string; logo: string | null; currency: string;
    }>(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    total: numeric("total", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    dueDate: date("due_date"),
    createdById: bigint("created_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    index("orders_organization_ordered_at_idx").on(
      table.organizationId,
      table.orderedAt,
    ),
    index("orders_outlet_idx").on(table.outletId),
    index("orders_sales_idx").on(table.salesId),
    index("orders_status_idx").on(table.status),
    index("orders_transaction_number_idx").on(table.transactionNumber),
    uniqueIndex("orders_org_number_unique").on(table.organizationId, table.transactionNumber),
    uniqueIndex("orders_org_request_unique").on(table.organizationId, table.requestKey),
  ],
);

/** Line items of a sales order. */
export const orderItems = pgTable(
  "order_items",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).default("0").notNull(),
    sellUnitId: bigint("sell_unit_id", { mode: "number" }).references(() => productSellUnits.id),
    productName: varchar("product_name", { length: 200 }),
    productCode: varchar("product_code", { length: 80 }),
    unitName: varchar("unit_name", { length: 150 }),
    baseUnitName: varchar("base_unit_name", { length: 150 }),
    conversionFactor: numeric("conversion_factor", { precision: 18, scale: 6 }),
    baseQuantity: numeric("base_quantity", { precision: 20, scale: 6 }),
    unitPrice: numeric("unit_price", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    subtotal: numeric("subtotal", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_organization_idx").on(table.organizationId),
  ],
);

/** Billing record for an order (finance in/out tracking). */
export const invoices = pgTable(
  "invoices",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    transactionNumber: varchar("transaction_number", { length: 60 }).notNull(),
    orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    salesName: varchar("sales_name", { length: 150 }),
    invoiceAmount: numeric("invoice_amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    outstandingAmount: numeric("outstanding_amount", {
      precision: 15,
      scale: 2,
    })
      .default("0")
      .notNull(),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    dueDate: date("due_date"),
    status: invoiceStatusEnum("status").default("unpaid").notNull(),
    paymentMethod: varchar("payment_method", { length: 60 }),
    paymentProofUrl: text("payment_proof_url"),
    createdById: bigint("created_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoices_order_unique")
      .on(table.orderId)
      .where(isNull(table.deletedAt)),
    index("invoices_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("invoices_due_date_idx").on(table.dueDate),
    uniqueIndex("invoices_org_number_unique").on(table.organizationId, table.transactionNumber),
  ],
);
