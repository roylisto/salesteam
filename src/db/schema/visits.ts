import { isNull } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { outlets } from "./master-data";
import { users } from "./auth";
import { orders } from "./orders";
import { requestStatusEnum, routeCycleTypeEnum, visitStatusEnum } from "./enums";

/** Weekly call plan for a sales rep. */
export const routes = pgTable(
  "routes",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    salesId: bigint("sales_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    weekEndDate: date("week_end_date"),
    routeName: varchar("route_name", { length: 150 }),
    cycleType: routeCycleTypeEnum("cycle_type").default("1x1").notNull(),
    cycleWeeks: integer("cycle_weeks").default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdById: bigint("created_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    index("routes_organization_sales_idx").on(
      table.organizationId,
      table.salesId,
    ),
    index("routes_week_start_idx").on(table.weekStartDate),
  ],
);

/** Scheduled outlet visits within a route. */
export const routeAssignments = pgTable(
  "route_assignments",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    routeId: bigint("route_id", { mode: "number" })
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    outletId: bigint("outlet_id", { mode: "number" })
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(),
    sequence: integer("sequence").notNull(),
    scheduledDate: date("scheduled_date").notNull(),
    visitId: bigint("visit_id", { mode: "number" }).references(() => visits.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("route_assignments_route_day_idx").on(table.routeId, table.dayOfWeek),
    index("route_assignments_scheduled_date_idx").on(table.scheduledDate),
    index("route_assignments_organization_idx").on(table.organizationId),
  ],
);

/**
 * Call visit record with GPS check-in/out.
 * High-volume: one row per outlet per sales rep per day.
 */
export const visits = pgTable(
  "visits",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    salesId: bigint("sales_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outletId: bigint("outlet_id", { mode: "number" })
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    routeId: bigint("route_id", { mode: "number" }).references(() => routes.id, {
      onDelete: "set null",
    }),
    orderId: bigint("order_id", { mode: "number" }).references(() => orders.id, {
      onDelete: "set null",
    }),
    visitDate: date("visit_date").notNull(),
    checkinTime: time("checkin_time"),
    checkinLatitude: doublePrecision("checkin_latitude"),
    checkinLongitude: doublePrecision("checkin_longitude"),
    checkinDistance: numeric("checkin_distance", { precision: 8, scale: 2 }),
    checkinPhotoUrl: text("checkin_photo_url"),
    checkoutTime: time("checkout_time"),
    checkoutLatitude: doublePrecision("checkout_latitude"),
    checkoutLongitude: doublePrecision("checkout_longitude"),
    hasTransaction: boolean("has_transaction").default(false).notNull(),
    visitReason: varchar("visit_reason", { length: 150 }),
    visitReasonNotes: text("visit_reason_notes"),
    marketIntelligence: text("market_intelligence"),
    competitorPhotoUrl: text("competitor_photo_url"),
    status: visitStatusEnum("status").default("scheduled").notNull(),
    durationMinutes: integer("duration_minutes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("visits_sales_outlet_date_unique")
      .on(table.salesId, table.outletId, table.visitDate)
      .where(isNull(table.deletedAt)),
    index("visits_organization_date_idx").on(
      table.organizationId,
      table.visitDate,
    ),
    index("visits_sales_date_idx").on(table.salesId, table.visitDate),
    index("visits_outlet_date_idx").on(table.outletId, table.visitDate),
    index("visits_route_date_idx").on(table.routeId, table.visitDate),
    index("visits_status_idx").on(table.status),
  ],
);

/** Stock snapshot captured by the sales rep before a visit. */
export const visitStockChecks = pgTable(
  "visit_stock_checks",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    visitId: bigint("visit_id", { mode: "number" })
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    productCode: varchar("product_code", { length: 80 }).notNull(),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (table) => [
    index("visit_stock_checks_visit_idx").on(table.visitId),
    index("visit_stock_checks_organization_idx").on(table.organizationId),
  ],
);

/** Request from a sales rep to add an outlet into a route, needing approval. */
export const outletAssignmentRequests = pgTable(
  "outlet_assignment_requests",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    outletId: bigint("outlet_id", { mode: "number" })
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    routeId: bigint("route_id", { mode: "number" })
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(),
    requestedById: bigint("requested_by_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedById: bigint("approved_by_id", { mode: "number" }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    status: requestStatusEnum("status").default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("outlet_assignment_requests_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("outlet_assignment_requests_requested_by_idx").on(
      table.requestedById,
    ),
    uniqueIndex("outlet_assignment_requests_pending_unique")
      .on(table.routeId, table.outletId, table.dayOfWeek, table.status)
      .where(isNull(table.deletedAt)),
  ],
);
