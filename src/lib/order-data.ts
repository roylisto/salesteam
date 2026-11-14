import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, invoices, notDeleted, orderItems, orderPayments, orders, productTypes, users, warehouses } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { orderSalesScope } from "@/lib/order-access";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";

export async function orderOptions(user: CurrentUser) {
  const orgId = user.organization.id;
  const [sales, locations, brandOptions, typeOptions] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.organizationId, orgId), notDeleted(users), eq(users.isActive, true), eq(users.userType, "sales"), orderSalesScope(user, users.id))).orderBy(asc(users.name), asc(users.id)),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(and(eq(warehouses.organizationId, orgId), notDeleted(warehouses), eq(warehouses.isActive, true))).orderBy(asc(warehouses.name)),
    db.select({ id: brands.id, name: brands.name }).from(brands).where(and(eq(brands.organizationId, orgId), notDeleted(brands))).orderBy(asc(brands.name)),
    db.select({ id: productTypes.id, name: productTypes.name }).from(productTypes).where(and(eq(productTypes.organizationId, orgId), notDeleted(productTypes))).orderBy(asc(productTypes.name)),
  ]);
  return { sales, warehouses: locations, brands: brandOptions, types: typeOptions };
}

type Params = Record<string, string | string[] | undefined>;
export async function orderList(user: CurrentUser, params: Params) {
  const { q, page, pageSize } = loadTableQuery(params);
  const filter = and(eq(orders.organizationId, user.organization.id), notDeleted(orders), orderSalesScope(user, orders.salesId),
    tableSearch(q, orders.transactionNumber, orders.quotationNumber, orders.referenceNumber, sql`${orders.snapshot}->>'customer'`, sql`${orders.snapshot}->>'sales'`),
    ["quotation", "confirmed", "fulfilled", "cancelled"].includes(String(params.status)) ? eq(orders.status, String(params.status)) : undefined,
    typeof params.sales === "string" && params.sales ? eq(orders.salesId, Number.isSafeInteger(Number(params.sales)) ? Number(params.sales) : -1) : undefined,
  );
  const base = db.select({
    id: orders.id, number: orders.transactionNumber, date: orders.orderedAt, total: orders.total, status: orders.status,
    customer: sql<string | null>`${orders.snapshot}->>'customer'`, sales: sql<string | null>`${orders.snapshot}->>'sales'`,
    invoice: invoices.transactionNumber, paymentStatus: invoices.status, paid: invoices.paidAmount, outstanding: invoices.outstandingAmount,
  }).from(orders).leftJoin(invoices, and(eq(invoices.orderId, orders.id), eq(invoices.organizationId, user.organization.id), notDeleted(invoices)))
    .where(filter).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("visible_orders"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(desc(orders.orderedAt), desc(orders.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}

export async function getOrder(user: CurrentUser, id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.organizationId, user.organization.id), notDeleted(orders), orderSalesScope(user, orders.salesId)));
  if (!order) return null;
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.orderId, id), eq(invoices.organizationId, user.organization.id), notDeleted(invoices)));
  return { order, invoice: invoice ?? null };
}

export async function orderDetailRows(orgId: number, orderId: number, params: Params, payments: boolean) {
  const { q, page, pageSize } = loadTableQuery(params);
  if (payments) {
    const filter = and(eq(orderPayments.organizationId, orgId), eq(orderPayments.orderId, orderId), notDeleted(orderPayments), tableSearch(q, orderPayments.transactionNumber, orderPayments.method, orderPayments.reference));
    const [totals] = await db.select({ total: count() }).from(orderPayments).where(filter);
    const pagination = paginateTable(totals.total, page, pageSize);
    const rows = await db.select().from(orderPayments).where(filter).orderBy(desc(orderPayments.id)).limit(pageSize).offset(pagination.offset);
    return { payments: rows, items: null, pagination };
  }
  const filter = and(eq(orderItems.organizationId, orgId), eq(orderItems.orderId, orderId), notDeleted(orderItems), tableSearch(q, orderItems.productName, orderItems.productCode));
  const [totals] = await db.select({ total: count() }).from(orderItems).where(filter);
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await db.select().from(orderItems).where(filter).orderBy(asc(orderItems.id)).limit(pageSize).offset(pagination.offset);
  return { payments: null, items: rows, pagination };
}
