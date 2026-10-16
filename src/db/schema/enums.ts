import { pgEnum } from "drizzle-orm/pg-core";

/** Warehouse stock transaction direction. */
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["in", "out"]);

/** Warehouse stock transaction lifecycle. */
export const stockMovementStatusEnum = pgEnum("stock_movement_status", [
  "draft",
  "in_progress",
  "completed",
]);

/** Sales stock (in/out) direction. */
export const salesStockTypeEnum = pgEnum("sales_stock_type", ["in", "out"]);

/** Sales stock lifecycle. */
export const salesStockStatusEnum = pgEnum("sales_stock_status", [
  "draft",
  "completed",
]);

/** Call-visit lifecycle. */
export const visitStatusEnum = pgEnum("visit_status", [
  "scheduled",
  "in_progress",
  "completed",
  "missed",
]);

/** Route visit cycle (1 visit every 1/2/3/4 weeks). */
export const routeCycleTypeEnum = pgEnum("route_cycle_type", [
  "1x1",
  "1x2",
  "1x3",
  "1x4",
]);

/** Outlet route assignment request approval state. */
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);

/** Payment method kind. */
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "transfer",
  "qris",
]);

/** Invoice settlement state. */
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "unpaid",
  "payment_uploaded",
  "paid",
  "cancelled",
]);

/** Background/scheduled task state. */
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "running",
  "success",
  "failed",
]);
