import "server-only";

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { areaOffices, notDeleted, outlets, outletTypes, productPrices, products, productSellUnits, productUnits, warehouses } from "@/db/schema";

export async function resolveOutletProductPrice(organizationId: number, sellUnitId: number, outletId: number) {
  const [outlet] = await db.select({
    typeId: outletTypes.id, warehouseId: warehouses.id, areaId: areaOffices.id,
    warehouseName: warehouses.name, areaName: areaOffices.name,
  }).from(outlets)
    .leftJoin(outletTypes, and(eq(outlets.outletTypeId, outletTypes.id), eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)))
    .leftJoin(warehouses, and(eq(outlets.warehouseId, warehouses.id), eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
    .leftJoin(areaOffices, and(eq(warehouses.areaOfficeId, areaOffices.id), eq(areaOffices.organizationId, organizationId), notDeleted(areaOffices)))
    .where(and(eq(outlets.id, outletId), eq(outlets.organizationId, organizationId), notDeleted(outlets))).limit(1);
  if (!outlet?.typeId) return null;

  const [price] = await db.select({ amount: productPrices.amount, areaId: productPrices.areaId, warehouseId: productPrices.warehouseId })
    .from(productPrices)
    .innerJoin(productSellUnits, and(eq(productPrices.sellUnitId, productSellUnits.id), eq(productSellUnits.organizationId, organizationId), notDeleted(productSellUnits)))
    .innerJoin(products, and(eq(productSellUnits.productId, products.id), eq(products.organizationId, organizationId), notDeleted(products), eq(products.status, "active")))
    .innerJoin(productUnits, and(eq(productSellUnits.unitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
    .where(and(
      eq(productPrices.organizationId, organizationId), notDeleted(productPrices),
      eq(productPrices.sellUnitId, sellUnitId), eq(productPrices.outletTypeId, outlet.typeId),
      or(
        outlet.warehouseId ? eq(productPrices.warehouseId, outlet.warehouseId) : undefined,
        outlet.areaId ? eq(productPrices.areaId, outlet.areaId) : undefined,
        and(isNull(productPrices.areaId), isNull(productPrices.warehouseId)),
      ),
    ))
    .orderBy(desc(sql`case when ${productPrices.warehouseId} is not null then 3 when ${productPrices.areaId} is not null then 2 else 1 end`))
    .limit(1);
  if (!price) return null;
  return { amount: price.amount, source: price.warehouseId ? `Gudang · ${outlet.warehouseName}` : price.areaId ? `Area · ${outlet.areaName}` : "Global" };
}
