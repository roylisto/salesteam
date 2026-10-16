import {
  bigint,
  date,
  index,
  integer,
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
    quantity: integer("quantity").default(0).notNull(),
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
    uniqueIndex("invoices_order_unique").on(table.orderId),
    index("invoices_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("invoices_due_date_idx").on(table.dueDate),
  ],
);
