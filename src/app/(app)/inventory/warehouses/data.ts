import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { brands, notDeleted, products, productTypes, productUnits, stockMovements, users, warehouses, warehouseStocks } from "@/db/schema";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

export function filterId(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : -1;
}

export async function stockOptions(orgId: number, activeOnly = false) {
  const [locations, brandOptions, typeOptions] = await Promise.all([
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(and(
      eq(warehouses.organizationId, orgId), notDeleted(warehouses), activeOnly ? eq(warehouses.isActive, true) : undefined,
    )).orderBy(asc(warehouses.name)),
    db.select({ id: brands.id, name: brands.name }).from(brands)
      .where(and(eq(brands.organizationId, orgId), notDeleted(brands))).orderBy(asc(brands.name)),
    db.select({ id: productTypes.id, name: productTypes.name }).from(productTypes)
      .where(and(eq(productTypes.organizationId, orgId), notDeleted(productTypes))).orderBy(asc(productTypes.name)),
  ]);
  return { warehouses: locations, brands: brandOptions, types: typeOptions };
}

export async function stockBalance(orgId: number, params: Record<string, string | string[] | undefined>) {
  const query = loadTableQuery(params);
  const { q, page, pageSize, sort, dir } = query;
  const warehouseId = filterId(params.warehouse);
  const brandId = filterId(params.brand);
  const typeId = filterId(params.type);
  const filter = and(
    eq(warehouseStocks.organizationId, orgId), notDeleted(warehouseStocks),
    tableSearch(q, products.name, products.code, warehouses.name),
    warehouseId === undefined ? undefined : eq(warehouseStocks.warehouseId, warehouseId),
    brandId === undefined ? undefined : eq(products.brandId, brandId),
    typeId === undefined ? undefined : eq(products.productTypeId, typeId),
  );
  const base = db.select({
    id: warehouseStocks.id, warehouse: warehouses.name, product: products.name, code: products.code,
    brand: brands.name, type: productTypes.name, quantity: warehouseStocks.quantity, unit: productUnits.name,
  }).from(warehouseStocks)
    .innerJoin(warehouses, and(eq(warehouseStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, orgId), notDeleted(warehouses)))
    .innerJoin(products, and(eq(warehouseStocks.productId, products.id), eq(products.organizationId, orgId), notDeleted(products)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits)))
    .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.organizationId, orgId), notDeleted(brands)))
    .leftJoin(productTypes, and(eq(products.productTypeId, productTypes.id), eq(productTypes.organizationId, orgId), notDeleted(productTypes)))
    .where(filter).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("balances"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const order = tableOrder({ product: products.name, warehouse: warehouses.name, quantity: warehouseStocks.quantity }, sort, dir, asc(products.name));
  const rows = await base.orderBy(order, asc(warehouseStocks.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}

export async function stockHistory(orgId: number, params: Record<string, string | string[] | undefined>) {
  const { q, page, pageSize } = loadTableQuery(params);
  const source = alias(warehouses, "source");
  const destination = alias(warehouses, "destination");
  const original = alias(stockMovements, "original_movement");
  const warehouseId = filterId(params.warehouse);
  const base = db.select({
    id: stockMovements.id, date: stockMovements.transactionDate, number: stockMovements.transactionNumber,
    reference: stockMovements.referenceNumber, type: stockMovements.type, status: stockMovements.status,
    source: source.name, destination: destination.name, actor: users.name,
    originalType: original.type, reversalOfId: stockMovements.reversalOfId, replacementOfId: stockMovements.replacementOfId,
  }).from(stockMovements)
    .leftJoin(source, and(eq(stockMovements.sourceWarehouseId, source.id), eq(source.organizationId, orgId)))
    .leftJoin(destination, and(eq(stockMovements.destinationWarehouseId, destination.id), eq(destination.organizationId, orgId)))
    .leftJoin(users, and(eq(stockMovements.inputById, users.id), eq(users.organizationId, orgId)))
    .leftJoin(original, and(eq(stockMovements.reversalOfId, original.id), eq(original.organizationId, orgId)))
    .where(and(eq(stockMovements.organizationId, orgId), notDeleted(stockMovements),
      tableSearch(q, stockMovements.transactionNumber, stockMovements.referenceNumber, source.name, destination.name),
      warehouseId === undefined ? undefined : or(eq(stockMovements.sourceWarehouseId, warehouseId), eq(stockMovements.destinationWarehouseId, warehouseId)),
      params.direction === "in" || params.direction === "out" ? eq(stockMovements.type, params.direction) : undefined,
    )).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("movements"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(desc(stockMovements.transactionDate), desc(stockMovements.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}
