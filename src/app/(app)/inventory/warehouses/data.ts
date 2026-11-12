import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, notDeleted, productTypes, salesStocks, stockMovements, users, warehouses } from "@/db/schema";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { warehouseBalanceQuery } from "@/lib/warehouse-balance";
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
  const balances = warehouseBalanceQuery(orgId, { q, warehouseId, brandId, typeId }).as("warehouse_balances");
  const groups = db.select({
    id: balances.warehouseId, warehouse: balances.warehouse,
    quantity: sql<string>`sum(${balances.quantity})::text`.as("total_quantity"),
    skuCount: count().as("sku_count"), unitCount: sql<number>`count(distinct coalesce(${balances.unit}, 'Tanpa satuan'))::int`.as("unit_count"),
    unit: sql<string | null>`min(${balances.unit})`.as("single_unit"),
  }).from(balances).groupBy(balances.warehouseId, balances.warehouse).as("warehouse_groups");
  const [totals] = await db.select({ total: count() }).from(groups);
  const pagination = paginateTable(totals.total, page, pageSize);
  const order = tableOrder({ warehouse: groups.warehouse, quantity: sql`${groups.quantity}::numeric` }, sort, dir, asc(groups.warehouse));
  const rows = await db.select().from(groups).orderBy(order, asc(groups.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };

}

export async function stockHistory(orgId: number, params: Record<string, string | string[] | undefined>) {
  const { q, page, pageSize } = loadTableQuery(params);
  const source = alias(warehouses, "source");
  const destination = alias(warehouses, "destination");
  const original = alias(stockMovements, "original_movement");
  const salesUser = alias(users, "sales_user");
  const warehouseId = filterId(params.warehouse);
  const base = db.select({
    id: stockMovements.id, date: stockMovements.transactionDate, number: stockMovements.transactionNumber,
    reference: stockMovements.referenceNumber, type: stockMovements.type, status: stockMovements.status,
    source: source.name, destination: destination.name, actor: users.name,
    originalType: original.type, reversalOfId: stockMovements.reversalOfId, replacementOfId: stockMovements.replacementOfId,
    salesName: salesUser.name, salesType: salesStocks.type,
  }).from(stockMovements)
    .leftJoin(source, and(eq(stockMovements.sourceWarehouseId, source.id), eq(source.organizationId, orgId)))
    .leftJoin(destination, and(eq(stockMovements.destinationWarehouseId, destination.id), eq(destination.organizationId, orgId)))
    .leftJoin(users, and(eq(stockMovements.inputById, users.id), eq(users.organizationId, orgId)))
    .leftJoin(original, and(eq(stockMovements.reversalOfId, original.id), eq(original.organizationId, orgId)))
    .leftJoin(salesStocks, and(eq(salesStocks.warehouseMovementId, stockMovements.id), eq(salesStocks.organizationId, orgId)))
    .leftJoin(salesUser, and(eq(salesStocks.salesId, salesUser.id), eq(salesUser.organizationId, orgId)))
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
