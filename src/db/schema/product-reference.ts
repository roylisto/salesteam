import { isNull } from "drizzle-orm";
import { bigint, boolean, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";

export const brands = pgTable("brands", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  name: varchar("name", { length: 150 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("brands_org_name_unique").on(t.organizationId, t.name).where(isNull(t.deletedAt))]);

export const productTypes = pgTable("product_types", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  name: varchar("name", { length: 150 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("product_types_org_name_unique").on(t.organizationId, t.name).where(isNull(t.deletedAt))]);

export const productUnits = pgTable("product_units", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  name: varchar("name", { length: 150 }).notNull(),
  allowFraction: boolean("allow_fraction").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("product_units_org_name_unique").on(t.organizationId, t.name).where(isNull(t.deletedAt))]);
