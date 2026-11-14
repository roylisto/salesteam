import "server-only";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@/db";
import { notDeleted, products, productSellUnits, productUnits } from "@/db/schema";

export function pricedSkuQuery(db: Pick<Database, "select">, orgId: number, outletTypeId: number, warehouseId: number, areaId: number | null, extra?: SQL) {
  const baseUnit = alias(productUnits, "base_unit");
  return db.select({
    id: productSellUnits.id, productId: products.id, name: products.name, code: products.code, image: products.imageUrl,
    brandId: products.brandId, typeId: products.productTypeId,
    unit: productUnits.name, baseUnit: baseUnit.name, factor: productSellUnits.factor,
    allowFraction: productUnits.allowFraction, baseAllowFraction: baseUnit.allowFraction,
    price: sql<string | null>`(select p.amount::text from product_prices p
      where p.organization_id = ${orgId} and p.sell_unit_id = ${productSellUnits.id} and p.outlet_type_id = ${outletTypeId} and p.deleted_at is null
      and (p.warehouse_id = ${warehouseId} or (p.warehouse_id is null and p.area_id = ${areaId}) or (p.warehouse_id is null and p.area_id is null))
      order by case when p.warehouse_id is not null then 0 when p.area_id is not null then 1 else 2 end limit 1)`,
  }).from(productSellUnits)
    .innerJoin(products, and(eq(productSellUnits.productId, products.id), eq(products.organizationId, orgId), notDeleted(products), eq(products.status, "active")))
    .innerJoin(productUnits, and(eq(productSellUnits.unitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits), eq(productUnits.isActive, true)))
    .innerJoin(baseUnit, and(eq(products.baseUnitId, baseUnit.id), eq(baseUnit.organizationId, orgId), notDeleted(baseUnit), eq(baseUnit.isActive, true)))
    .where(and(eq(productSellUnits.organizationId, orgId), notDeleted(productSellUnits), extra)).$dynamic();
}
