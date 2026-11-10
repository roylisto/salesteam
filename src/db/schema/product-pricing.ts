import { sql } from "drizzle-orm";
import { bigint, check, index, numeric, pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { areaOffices, outletTypes, products, warehouses } from "./master-data";
import { organizations } from "./organizations";
import { productUnits } from "./product-reference";

export const productSellUnits = pgTable("product_sell_units", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  productId: bigint("product_id", { mode: "number" }).notNull().references(() => products.id),
  unitId: bigint("unit_id", { mode: "number" }).notNull().references(() => productUnits.id),
  factor: numeric("factor", { precision: 18, scale: 6 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("product_sell_units_active_unique").on(t.productId, t.unitId).where(sql`${t.deletedAt} is null`),
  check("product_sell_units_positive_factor", sql`${t.factor} > 0`),
]);

export const productPrices = pgTable("product_prices", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
  sellUnitId: bigint("sell_unit_id", { mode: "number" }).notNull().references(() => productSellUnits.id),
  outletTypeId: bigint("outlet_type_id", { mode: "number" }).notNull().references(() => outletTypes.id),
  areaId: bigint("area_id", { mode: "number" }).references(() => areaOffices.id),
  warehouseId: bigint("warehouse_id", { mode: "number" }).references(() => warehouses.id),
  amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("product_prices_scope_unique").on(t.sellUnitId, t.outletTypeId,
    sql`coalesce(${t.areaId}, 0)`, sql`coalesce(${t.warehouseId}, 0)`).where(sql`${t.deletedAt} is null`),
  index("product_prices_org_idx").on(t.organizationId),
  check("product_prices_one_scope", sql`${t.areaId} is null or ${t.warehouseId} is null`),
  check("product_prices_nonnegative_amount", sql`${t.amount} >= 0`),
]);
