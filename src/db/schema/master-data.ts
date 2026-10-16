import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./auth";

/** Area office / region grouping above warehouses. */
export const areaOffices = pgTable(
  "area_offices",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("area_offices_organization_idx").on(table.organizationId),
  ],
);

/**
 * Areas assigned to a member. A member can cover multiple areas, always a
 * subset of their reporting line's areas (e.g. a manager under a regional
 * manager only sees the areas handed down to them).
 */
export const userAreaAssignments = pgTable(
  "user_area_assignments",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    areaOfficeId: bigint("area_office_id", { mode: "number" })
      .notNull()
      .references(() => areaOffices.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_area_assignments_user_area_unique").on(
      table.userId,
      table.areaOfficeId,
    ),
    index("user_area_assignments_organization_idx").on(table.organizationId),
    index("user_area_assignments_user_idx").on(table.userId),
    index("user_area_assignments_area_idx").on(table.areaOfficeId),
  ],
);

/** Warehouse / depot that holds product stock. */
export const warehouses = pgTable(
  "warehouses",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    areaOfficeId: bigint("area_office_id", { mode: "number" }).references(
      () => areaOffices.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 150 }).notNull(),
    depotType: varchar("depot_type", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("warehouses_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("warehouses_area_office_idx").on(table.areaOfficeId),
  ],
);

/** Product catalogue. */
export const products = pgTable(
  "products",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 80 }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    brand: varchar("brand", { length: 120 }),
    division: varchar("division", { length: 120 }),
    category: varchar("category", { length: 120 }),
    supplier: varchar("supplier", { length: 150 }),
    productType: varchar("product_type", { length: 120 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    length: integer("length"),
    width: integer("width"),
    height: integer("height"),
    weight: integer("weight"),
    purchasePrice: bigint("purchase_price", { mode: "number" }),
    retailPrice: bigint("retail_price", { mode: "number" }),
    wholesalePrice: bigint("wholesale_price", { mode: "number" }),
    agentPrice: bigint("agent_price", { mode: "number" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_organization_code_unique").on(
      table.organizationId,
      table.code,
    ),
    index("products_organization_idx").on(table.organizationId),
    index("products_name_idx").on(table.name),
  ],
);

/** Outlet / customer store visited by sales reps. */
export const outlets = pgTable(
  "outlets",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    warehouseId: bigint("warehouse_id", { mode: "number" }).references(
      () => warehouses.id,
      { onDelete: "set null" },
    ),
    salesId: bigint("sales_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    code: varchar("code", { length: 80 }),
    name: varchar("name", { length: 200 }),
    outletType: varchar("outlet_type", { length: 50 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    imageUrl: text("image_url"),
    notes: text("notes"),
    address: text("address"),
    addressDetail: text("address_detail"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    country: varchar("country", { length: 100 }),
    province: varchar("province", { length: 120 }),
    city: varchar("city", { length: 120 }),
    district: varchar("district", { length: 120 }),
    village: varchar("village", { length: 120 }),
    postalCode: varchar("postal_code", { length: 20 }),
    ownerName: varchar("owner_name", { length: 150 }),
    ownerAddress: text("owner_address"),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    nationalId: varchar("national_id", { length: 50 }),
    taxId: varchar("tax_id", { length: 50 }),
    familyCardNumber: varchar("family_card_number", { length: 50 }),
    businessId: varchar("business_id", { length: 50 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("outlets_organization_code_unique").on(
      table.organizationId,
      table.code,
    ),
    index("outlets_organization_idx").on(table.organizationId),
    index("outlets_warehouse_idx").on(table.warehouseId),
    index("outlets_sales_idx").on(table.salesId),
    index("outlets_name_idx").on(table.name),
  ],
);

/** Current stock level per product per warehouse (aggregate). */
export const warehouseStocks = pgTable(
  "warehouse_stocks",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    warehouseId: bigint("warehouse_id", { mode: "number" })
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("warehouse_stocks_warehouse_product_unique").on(
      table.warehouseId,
      table.productId,
    ),
    index("warehouse_stocks_organization_idx").on(table.organizationId),
  ],
);
