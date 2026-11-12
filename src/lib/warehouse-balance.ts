import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, notDeleted, products, productTypes, productUnits, warehouses, warehouseStocks } from "@/db/schema";
import { tableSearch } from "@/lib/table-sql";

export type BalanceFilters = { q: string; warehouseId?: number; brandId?: number; typeId?: number };

export function warehouseBalanceQuery(orgId: number, filters: BalanceFilters) {
  return db.select({
    id: warehouseStocks.id, warehouseId: sql<number>`${warehouses.id}::float8`.as("warehouse_id"), warehouse: sql<string>`${warehouses.name}`.as("warehouse_name"),
    product: sql<string>`${products.name}`.as("product_name"), code: products.code, image: products.imageUrl,
    brand: sql<string | null>`${brands.name}`.as("brand_name"), type: sql<string | null>`${productTypes.name}`.as("type_name"), quantity: warehouseStocks.quantity,
    unit: sql<string | null>`${productUnits.name}`.as("unit_name"),
  }).from(warehouseStocks)
    .innerJoin(warehouses, and(eq(warehouseStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, orgId), notDeleted(warehouses)))
    .innerJoin(products, and(eq(warehouseStocks.productId, products.id), eq(products.organizationId, orgId), notDeleted(products)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits)))
    .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.organizationId, orgId), notDeleted(brands)))
    .leftJoin(productTypes, and(eq(products.productTypeId, productTypes.id), eq(productTypes.organizationId, orgId), notDeleted(productTypes)))
    .where(and(eq(warehouseStocks.organizationId, orgId), notDeleted(warehouseStocks),
      tableSearch(filters.q, products.name, products.code, warehouses.name),
      filters.warehouseId === undefined ? undefined : eq(warehouseStocks.warehouseId, filters.warehouseId),
      filters.brandId === undefined ? undefined : eq(products.brandId, filters.brandId),
      filters.typeId === undefined ? undefined : eq(products.productTypeId, filters.typeId),
    )).$dynamic();
}
