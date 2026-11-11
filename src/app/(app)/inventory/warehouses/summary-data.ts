import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notDeleted, products, productUnits, warehouses, warehouseStocks } from "@/db/schema";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";
import { filterId } from "./data";

type Params = Record<string, string | string[] | undefined>;

export async function stockSummary(organizationId: number, params: Params) {
  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const warehouseId = filterId(params.warehouse);
  const brandId = filterId(params.brand);
  const typeId = filterId(params.type);
  const requestedUnitId = filterId(params.unit);

  // A single snapshot keeps the cards, rankings and detail totals consistent during stock postings.
  return db.transaction(async (tx) => {
    const units = await tx.selectDistinct({ id: productUnits.id, name: productUnits.name })
      .from(warehouseStocks)
      .innerJoin(products, and(eq(warehouseStocks.productId, products.id), eq(products.organizationId, organizationId), notDeleted(products)))
      .innerJoin(warehouses, and(eq(warehouseStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
      .innerJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
      .where(and(eq(warehouseStocks.organizationId, organizationId), notDeleted(warehouseStocks)))
      .orderBy(asc(productUnits.name), asc(productUnits.id));
    const selectedUnit = units.find((unit) => unit.id === requestedUnitId) ?? units[0] ?? null;
    const base = tx.select({
      id: warehouseStocks.id,
      warehouseId: warehouseStocks.warehouseId,
      warehouse: sql<string>`${warehouses.name}`.as("warehouse_name"),
      productId: warehouseStocks.productId,
      product: sql<string>`${products.name}`.as("product_name"),
      code: products.code,
      quantity: warehouseStocks.quantity,
    }).from(warehouseStocks)
      .innerJoin(products, and(eq(warehouseStocks.productId, products.id), eq(products.organizationId, organizationId), notDeleted(products)))
      .innerJoin(warehouses, and(eq(warehouseStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
      .innerJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
      .where(and(
        eq(warehouseStocks.organizationId, organizationId), notDeleted(warehouseStocks),
        eq(productUnits.id, selectedUnit?.id ?? -1),
        warehouseId === undefined ? undefined : eq(warehouseStocks.warehouseId, warehouseId),
        brandId === undefined ? undefined : eq(products.brandId, brandId),
        typeId === undefined ? undefined : eq(products.productTypeId, typeId),
        tableSearch(q, products.code, products.name, warehouses.name),
      )).as("summary_balances");

    const sum = sql<string>`sum(${base.quantity})::text`;
    const [totals] = await tx.select({
      quantity: sql<string>`coalesce(sum(${base.quantity}), 0)::text`,
      warehouses: sql<number>`count(distinct ${base.warehouseId}) filter (where ${base.quantity} > 0)::int`,
      products: sql<number>`count(distinct ${base.productId}) filter (where ${base.quantity} > 0)::int`,
      rows: count(),
    }).from(base);
    const pagination = paginateTable(totals.rows, page, pageSize);
    const [byWarehouse, byProduct, rows] = await Promise.all([
      tx.select({
        id: base.warehouseId, name: base.warehouse, quantity: sum,
        products: sql<number>`count(distinct ${base.productId}) filter (where ${base.quantity} > 0)::int`,
      }).from(base).groupBy(base.warehouseId, base.warehouse)
        .having(sql`sum(${base.quantity}) > 0`)
        .orderBy(desc(sql`sum(${base.quantity})`), asc(base.warehouse), asc(base.warehouseId)).limit(10),
      tx.select({
        id: base.productId, name: base.product, code: base.code, quantity: sum,
        warehouses: sql<number>`count(distinct ${base.warehouseId}) filter (where ${base.quantity} > 0)::int`,
      }).from(base).groupBy(base.productId, base.product, base.code)
        .having(sql`sum(${base.quantity}) > 0`)
        .orderBy(desc(sql`sum(${base.quantity})`), asc(base.product), asc(base.productId)).limit(10),
      tx.select({
        id: base.id, warehouse: base.warehouse, product: base.product, code: base.code,
        quantity: base.quantity,
        productTotal: sql<string>`sum(${base.quantity}) over (partition by ${base.productId})::text`,
      }).from(base)
        .orderBy(tableOrder({ product: base.product, warehouse: base.warehouse, quantity: base.quantity }, sort, dir, asc(base.product)),
          asc(base.productId), desc(base.quantity), asc(base.warehouseId))
        .limit(pageSize).offset(pagination.offset),
    ]);
    return { units, selectedUnit, totals, byWarehouse, byProduct, rows, pagination };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
