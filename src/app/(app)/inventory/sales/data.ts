import "server-only";
import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { notDeleted, products, productUnits, salesInventory, salesStocks, stockMovements, users, warehouses } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { salesStockOwner } from "@/lib/sales-stock-policy";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { filterId, stockOptions } from "../warehouses/data";

export async function salesOptions(user: CurrentUser, type?: "in" | "out") {
  const orgId = user.organization.id;
  const owner = salesStockOwner(user);
  const [options, sales, origins] = await Promise.all([
    stockOptions(orgId, type === "in"),
    db.select({ id: users.id, name: users.name }).from(users).where(and(
      eq(users.organizationId, orgId), notDeleted(users), owner === undefined ? undefined : eq(users.id, owner),
      type === "in" ? and(eq(users.userType, "sales"), eq(users.isActive, true)) : or(eq(users.userType, "sales"),
        sql`exists (select 1 from ${salesInventory} where ${salesInventory.salesId} = ${users.id}
          and ${salesInventory.organizationId} = ${orgId} and ${notDeleted(salesInventory)} and ${salesInventory.quantity} > 0)`),
    )).orderBy(asc(users.name), asc(users.id)),
    db.selectDistinct({ salesId: salesInventory.salesId, warehouseId: salesInventory.warehouseId })
      .from(salesInventory).where(and(eq(salesInventory.organizationId, orgId), notDeleted(salesInventory),
        sql`${salesInventory.quantity} > 0`, owner === undefined ? undefined : eq(salesInventory.salesId, owner))),
  ]);
  return { ...options, sales, origins };
}

export async function salesBalance(user: CurrentUser, params: Record<string, string | string[] | undefined>) {
  const orgId = user.organization.id;
  const salesId = salesStockOwner(user) ?? filterId(params.sales);
  const warehouseId = filterId(params.warehouse);
  const { q, page, pageSize } = loadTableQuery(params);
  const base = db.select({
    id: salesInventory.id, sales: users.name, warehouse: warehouses.name, quantity: salesInventory.quantity, reserved: salesInventory.reservedQuantity,
    available: sql<string>`(${salesInventory.quantity} - ${salesInventory.reservedQuantity})::text`,
    product: products.name, code: products.code, unit: productUnits.name,
  }).from(salesInventory)
    .innerJoin(users, and(eq(salesInventory.salesId, users.id), eq(users.organizationId, orgId), notDeleted(users)))
    .innerJoin(products, and(eq(salesInventory.productId, products.id), eq(products.organizationId, orgId), notDeleted(products)))
    .leftJoin(warehouses, and(eq(salesInventory.warehouseId, warehouses.id), eq(warehouses.organizationId, orgId), notDeleted(warehouses)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits)))
    .where(and(eq(salesInventory.organizationId, orgId), notDeleted(salesInventory),
      salesId === undefined ? undefined : eq(salesInventory.salesId, salesId),
      warehouseId === undefined ? undefined : eq(salesInventory.warehouseId, warehouseId),
      tableSearch(q, products.name, products.code, users.name, warehouses.name),
    )).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("sales_balances"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(asc(users.name), asc(products.name), asc(salesInventory.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}

export async function salesHistory(user: CurrentUser, params: Record<string, string | string[] | undefined>) {
  const orgId = user.organization.id;
  const salesId = salesStockOwner(user) ?? filterId(params.sales);
  const warehouseId = filterId(params.warehouse);
  const { q, page, pageSize } = loadTableQuery(params);
  const recorder = alias(users, "recorder");
  const base = db.select({
    id: salesStocks.id, number: salesStocks.transactionNumber, date: salesStocks.transactionDate,
    type: salesStocks.type, status: salesStocks.status, sales: users.name, warehouse: warehouses.name,
    reference: salesStocks.referenceNumber, actor: recorder.name, warehouseMovementId: salesStocks.warehouseMovementId,
    warehouseNumber: stockMovements.transactionNumber,
  }).from(salesStocks)
    .leftJoin(users, and(eq(salesStocks.salesId, users.id), eq(users.organizationId, orgId)))
    .leftJoin(warehouses, and(eq(salesStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, orgId)))
    .leftJoin(recorder, and(eq(salesStocks.inputById, recorder.id), eq(recorder.organizationId, orgId)))
    .leftJoin(stockMovements, and(eq(salesStocks.warehouseMovementId, stockMovements.id), eq(stockMovements.organizationId, orgId)))
    .where(and(eq(salesStocks.organizationId, orgId), notDeleted(salesStocks),
      salesId === undefined ? undefined : eq(salesStocks.salesId, salesId),
      warehouseId === undefined ? undefined : eq(salesStocks.warehouseId, warehouseId),
      params.direction === "in" || params.direction === "out" ? eq(salesStocks.type, params.direction) : undefined,
      tableSearch(q, salesStocks.transactionNumber, salesStocks.referenceNumber, users.name, warehouses.name, stockMovements.transactionNumber),
    )).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("sales_movements"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(desc(salesStocks.transactionDate), desc(salesStocks.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}
