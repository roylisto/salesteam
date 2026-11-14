"use server";

import { createHash } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, type Database } from "@/db";
import { areaOffices, invoices, notDeleted, orderCounters, orderItems, orderPayments, orders, organizations, outlets, outletTypes, products, productSellUnits, salesInventory, users, warehouses } from "@/db/schema";
import { can, getCurrentUser, type CurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { orderSalesScope } from "@/lib/order-access";
import { pricedSkuQuery } from "@/lib/order-catalog";
import { cents, fromCents, fromMicros, ORDER_PATH } from "@/lib/order";
import { reserveOrderStock, releaseOrderStock } from "@/lib/order-stock";
import { quantityMicros, SALES_STOCK_PATH } from "@/lib/stock";
import { PAGE_SIZES, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { lockWarehouseStock, StockError } from "@/lib/warehouse-stock-mutation";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const quantity = z.string().trim().refine((value) => /^\d{1,14}(\.\d{1,6})?$/.test(value) && quantityMicros(value) > BigInt(0));
const inputSchema = z.object({ requestKey: z.string().uuid(), salesId: id, outletId: id, warehouseId: id,
  kind: z.enum(["quotation", "confirmed"]), date: z.iso.date(), dueDate: z.union([z.iso.date(), z.literal("")]),
  reference: z.string().trim().max(60), notes: z.string().trim().max(2000),
  items: z.array(z.object({ sellUnitId: id, quantity })).min(1).max(1000),
});

async function orderActor() {
  const actor = await getCurrentUser();
  if (!actor || !can(actor, "orders")) throw new StockError("Anda tidak memiliki izin order penjualan.");
  return actor;
}

async function context(tx: Pick<Database, "select">, actor: CurrentUser, salesId: number, outletId: number, warehouseId: number) {
  const orgId = actor.organization.id;
  const [sales] = await tx.select().from(users).where(and(eq(users.id, salesId), eq(users.organizationId, orgId), notDeleted(users),
    eq(users.isActive, true), eq(users.userType, "sales"), orderSalesScope(actor, users.id)));
  const [outlet] = await tx.select({ id: outlets.id, name: outlets.name, address: outlets.address, addressDetail: outlets.addressDetail, typeId: outlets.outletTypeId })
    .from(outlets).innerJoin(outletTypes, and(eq(outlets.outletTypeId, outletTypes.id), eq(outletTypes.organizationId, orgId), notDeleted(outletTypes), eq(outletTypes.isActive, true)))
    .where(and(eq(outlets.id, outletId), eq(outlets.organizationId, orgId), notDeleted(outlets), eq(outlets.status, "active")));
  const [warehouse] = await tx.select({ id: warehouses.id, name: warehouses.name, areaId: warehouses.areaOfficeId, area: areaOffices.name })
    .from(warehouses).leftJoin(areaOffices, and(eq(warehouses.areaOfficeId, areaOffices.id), eq(areaOffices.organizationId, orgId), notDeleted(areaOffices)))
    .where(and(eq(warehouses.id, warehouseId), eq(warehouses.organizationId, orgId), notDeleted(warehouses), eq(warehouses.isActive, true)));
  if (!sales || !outlet || !warehouse) throw new StockError("Sales di luar struktur Anda, outlet, tipe outlet, atau gudang tidak tersedia.");
  return { sales, outlet, warehouse };
}

async function number(tx: Tx, orgId: number, kind: string) {
  const [counter] = await tx.insert(orderCounters).values({ organizationId: orgId, kind, lastNumber: BigInt(1) })
    .onConflictDoUpdate({ target: [orderCounters.organizationId, orderCounters.kind], set: { lastNumber: sql`${orderCounters.lastNumber} + 1` } })
    .returning({ number: orderCounters.lastNumber });
  return `${kind}-O${BigInt(orgId).toString(36).toUpperCase()}-${counter.number.toString().padStart(6, "0")}`;
}

function refresh(orderId: number) {
  revalidatePath(ORDER_PATH); revalidatePath(`${ORDER_PATH}/${orderId}`); revalidatePath(SALES_STOCK_PATH);
  revalidatePath(`/print/orders/${orderId}`);
}
function failed(error: unknown) {
  if (error instanceof StockError) return { error: error.message };
  console.error("Order action failed", error instanceof Error ? error.name : "unknown");
  return { error: "Transaksi gagal. Coba ulang dengan data yang sama." };
}

export async function saveOrder(input: unknown): Promise<{ id?: number; error?: string }> {
  try {
    const actor = await orderActor();
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) throw new StockError("Periksa Sales, outlet, gudang asal, tanggal dan qty (maksimal 1.000 baris SKU).");
    const data = parsed.data;
    if (data.dueDate && data.dueDate < data.date) throw new StockError("Jatuh tempo tidak boleh sebelum tanggal order.");
    const items = data.items.slice().sort((a, b) => a.sellUnitId - b.sellUnitId);
    if (new Set(items.map((item) => item.sellUnitId)).size !== items.length) throw new StockError("Satuan jual SKU yang sama hanya boleh satu baris.");
    const hash = createHash("sha256").update(JSON.stringify({ ...data, items, requestKey: undefined })).digest("hex");
    const orgId = actor.organization.id;
    const saved = await db.transaction(async (tx) => {
      await lockWarehouseStock(tx, orgId);
      const [previous] = await tx.select().from(orders).where(and(eq(orders.organizationId, orgId), eq(orders.requestKey, data.requestKey)));
      if (previous) {
        if (previous.requestHash !== hash || previous.deletedAt) throw new StockError("Permintaan ini sudah digunakan untuk data lain.");
        const [visible] = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.id, previous.id), orderSalesScope(actor, orders.salesId)));
        if (!visible) throw new StockError("Order di luar struktur Anda.");
        return previous.id;
      }
      const { sales, outlet, warehouse } = await context(tx, actor, data.salesId, data.outletId, data.warehouseId);
      const rows = await pricedSkuQuery(tx, orgId, outlet.typeId!, warehouse.id, warehouse.areaId, inArray(productSellUnits.id, items.map((item) => item.sellUnitId)));
      if (rows.length !== items.length) throw new StockError("Ada SKU atau satuan yang tidak aktif.");
      const byId = new Map(rows.map((row) => [row.id, row]));
      let total = BigInt(0);
      const lines = items.map((item) => {
        const product = byId.get(item.sellUnitId)!;
        if (product.price === null) throw new StockError(`Harga ${product.name} belum diatur untuk tipe outlet ini.`);
        const qty = quantityMicros(item.quantity), factor = quantityMicros(product.factor);
        if (factor <= BigInt(0) || qty * factor % BigInt(1_000_000) !== BigInt(0)) throw new StockError("Konversi qty melebihi presisi enam desimal.");
        const baseQty = qty * factor / BigInt(1_000_000);
        if (!product.allowFraction && qty % BigInt(1_000_000) !== BigInt(0) || !product.baseAllowFraction && baseQty % BigInt(1_000_000) !== BigInt(0)) throw new StockError(`Qty ${product.name} harus sesuai satuannya.`);
        const subtotal = (cents(product.price) * qty + BigInt(500_000)) / BigInt(1_000_000);
        total += subtotal;
        return { organizationId: orgId, productId: product.productId, sellUnitId: product.id, productName: product.name, productCode: product.code,
          unitName: product.unit, baseUnitName: product.baseUnit, conversionFactor: product.factor, baseQuantity: fromMicros(baseQty),
          quantity: item.quantity, unitPrice: product.price, subtotal: fromCents(subtotal) };
      });
      if (total > BigInt("999999999999999")) throw new StockError("Nilai order melebihi batas nominal transaksi.");
      const [org] = await tx.select().from(organizations).where(and(eq(organizations.id, orgId), notDeleted(organizations)));
      if (!org) throw new StockError("Organisasi tidak tersedia.");
      const transactionNumber = await number(tx, orgId, data.kind === "quotation" ? "QT" : "SO");
      const [order] = await tx.insert(orders).values({ organizationId: orgId, salesId: sales.id, outletId: outlet.id, warehouseId: warehouse.id,
        transactionNumber, quotationNumber: data.kind === "quotation" ? transactionNumber : null, referenceNumber: data.reference || null,
        orderedAt: new Date(`${data.date}T12:00:00+07:00`), dueDate: data.dueDate || null, total: fromCents(total), status: data.kind,
        notes: data.notes || null, requestKey: data.requestKey, requestHash: hash, createdById: actor.id,
        snapshot: { customer: outlet.name ?? "Outlet", address: [outlet.address, outlet.addressDetail].filter(Boolean).join(", "), sales: sales.name,
          warehouse: warehouse.name, area: warehouse.area ?? "", company: org.name, companyAddress: org.address ?? "", phone: org.phone ?? "", logo: org.logoUrl, currency: org.currency },
      }).returning();
      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
      if (data.kind === "confirmed") await reserveOrderStock(tx, order);
      await recordAudit(tx, actor, "orders", "create", { id: order.id, name: `${transactionNumber} · ${outlet.name} · ${sales.name} · ${fromCents(total)}` });
      return order.id;
    });
    refresh(saved); return { id: saved };
  } catch (error) { return failed(error); }
}

export async function transitionOrder(input: unknown): Promise<{ id?: number; error?: string }> {
  try {
    const actor = await orderActor();
    const data = z.object({ id, action: z.enum(["confirm", "deliver", "cancel"]), reason: z.string().trim().max(1000).default("") }).parse(input);
    if (data.action === "cancel" && !data.reason) throw new StockError("Alasan pembatalan wajib diisi.");
    const orgId = actor.organization.id;
    await db.transaction(async (tx) => {
      await lockWarehouseStock(tx, orgId);
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, data.id), eq(orders.organizationId, orgId), notDeleted(orders), orderSalesScope(actor, orders.salesId))).for("update");
      if (!order || !order.snapshot) throw new StockError("Order tidak tersedia atau masih menggunakan data lama.");
      if (data.action === "confirm") {
        if (order.status === "confirmed" || order.status === "fulfilled") return;
        if (order.status !== "quotation") throw new StockError("Hanya penawaran yang dapat dikonfirmasi.");
        await context(tx, actor, order.salesId!, order.outletId, order.warehouseId!);
        await reserveOrderStock(tx, order);
        const transactionNumber = await number(tx, orgId, "SO");
        await tx.update(orders).set({ status: "confirmed", transactionNumber }).where(eq(orders.id, order.id));
      } else if (data.action === "deliver") {
        if (order.status === "fulfilled") return;
        if (order.status !== "confirmed") throw new StockError("Konfirmasi order terlebih dahulu.");
        await releaseOrderStock(tx, orgId, order.id, true);
        const transactionNumber = await number(tx, orgId, "INV");
        await tx.insert(invoices).values({ organizationId: orgId, orderId: order.id, transactionNumber, orderedAt: new Date(), customerName: order.snapshot.customer,
          salesName: order.snapshot.sales, invoiceAmount: order.total, outstandingAmount: order.total, paidAmount: "0", dueDate: order.dueDate,
          status: cents(order.total) === BigInt(0) ? "paid" : "unpaid", createdById: actor.id });
        await tx.update(orders).set({ status: "fulfilled", fulfilledAt: new Date() }).where(eq(orders.id, order.id));
      } else {
        if (order.status === "cancelled") return;
        if (order.status !== "quotation" && order.status !== "confirmed") throw new StockError("Barang sudah diserahkan. Pembatalan order hanya tersedia sebelum penyerahan barang.");
        if (order.status === "confirmed") await releaseOrderStock(tx, orgId, order.id, false);
        await tx.update(orders).set({ status: "cancelled", cancelledAt: new Date(), cancellationReason: data.reason }).where(eq(orders.id, order.id));
      }
      await recordAudit(tx, actor, "orders", data.action, { id: order.id, name: `${order.transactionNumber} · ${order.snapshot.customer}${data.reason ? ` · ${data.reason}` : ""}` });
    });
    refresh(data.id); return { id: data.id };
  } catch (error) { return failed(error); }
}

export async function recordOrderPayment(input: unknown): Promise<{ id?: number; error?: string }> {
  try {
    const actor = await orderActor();
    if (!can(actor, "order_payments")) throw new StockError("Anda tidak memiliki izin mencatat pembayaran order.");
    const data = z.object({ orderId: id, requestKey: z.string().uuid(), amount: z.string().trim().regex(/^\d{1,13}(\.\d{1,2})?$/),
      method: z.enum(["Tunai", "Transfer", "QRIS", "Lainnya"]), reference: z.string().trim().max(150) }).parse(input);
    if (cents(data.amount) <= BigInt(0)) throw new StockError("Nominal pembayaran harus positif.");
    const orgId = actor.organization.id;
    const hash = createHash("sha256").update(JSON.stringify({ ...data, requestKey: undefined })).digest("hex");
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, data.orderId), eq(orders.organizationId, orgId), notDeleted(orders), orderSalesScope(actor, orders.salesId))).for("update");
      if (!order || order.status !== "fulfilled") throw new StockError("Pembayaran hanya untuk order yang sudah diserahkan dan memiliki invoice.");
      const [previous] = await tx.select().from(orderPayments).where(and(eq(orderPayments.organizationId, orgId), eq(orderPayments.requestKey, data.requestKey)));
      if (previous) { if (previous.requestHash !== hash || previous.deletedAt) throw new StockError("Permintaan pembayaran sudah digunakan untuk data lain."); return; }
      const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.orderId, order.id), eq(invoices.organizationId, orgId), notDeleted(invoices))).for("update");
      if (!invoice || invoice.status === "cancelled" || cents(data.amount) > cents(invoice.outstandingAmount)) throw new StockError("Nominal melebihi sisa tagihan atau invoice tidak tersedia.");
      const remaining = cents(invoice.outstandingAmount) - cents(data.amount);
      const transactionNumber = await number(tx, orgId, "PAY");
      await tx.insert(orderPayments).values({ organizationId: orgId, orderId: order.id, invoiceId: invoice.id, transactionNumber,
        amount: fromCents(cents(data.amount)), method: data.method, reference: data.reference || null, requestKey: data.requestKey, requestHash: hash, createdById: actor.id });
      await tx.update(invoices).set({ paidAmount: fromCents(cents(invoice.paidAmount) + cents(data.amount)), outstandingAmount: fromCents(remaining),
        status: remaining === BigInt(0) ? "paid" : "unpaid", paymentMethod: data.method }).where(eq(invoices.id, invoice.id));
      await recordAudit(tx, actor, "orders", "payment", { id: order.id, name: `${transactionNumber} · ${order.transactionNumber} · ${data.amount} · ${data.method}` });
    });
    refresh(data.orderId); return { id: data.orderId };
  } catch (error) { return failed(error); }
}

const paging = { q: z.string().max(200), page: z.number().int().positive(), pageSize: z.union(PAGE_SIZES.map((size) => z.literal(size))) };
export async function searchOrderOutlets(input: unknown) {
  const actor = await orderActor();
  const data = z.object(paging).parse(input);
  const filter = and(eq(outlets.organizationId, actor.organization.id), notDeleted(outlets), eq(outlets.status, "active"), tableSearch(data.q, outlets.name, outlets.code));
  const [totals] = await db.select({ total: count() }).from(outlets).where(filter);
  const pagination = paginateTable(totals.total, data.page, data.pageSize);
  const rows = await db.select({ id: outlets.id, name: outlets.name, code: outlets.code }).from(outlets).where(filter).orderBy(asc(outlets.name), asc(outlets.id)).limit(data.pageSize).offset(pagination.offset);
  return { rows, pagination };
}
export async function loadOrderProducts(input: unknown) {
  const actor = await orderActor();
  const data = z.object({ ...paging, salesId: id, outletId: id, warehouseId: id, scope: z.enum(["all", "brand", "type"]), scopeId: id.optional() }).parse(input);
  const { outlet, warehouse } = await context(db, actor, data.salesId, data.outletId, data.warehouseId);
  if (data.scope !== "all" && !data.scopeId) throw new StockError("Pilih brand atau tipe terlebih dahulu.");
  const orgId = actor.organization.id;
  const base = pricedSkuQuery(db, orgId, outlet.typeId!, warehouse.id, warehouse.areaId, and(
    tableSearch(data.q, products.name, products.code), data.scope === "brand" ? eq(products.brandId, data.scopeId!) : undefined,
    data.scope === "type" ? eq(products.productTypeId, data.scopeId!) : undefined,
  )).leftJoin(salesInventory, and(eq(salesInventory.organizationId, orgId), eq(salesInventory.salesId, data.salesId),
    eq(salesInventory.warehouseId, data.warehouseId), eq(salesInventory.productId, products.id), notDeleted(salesInventory)));
  const [totals] = await db.select({ total: count() }).from(base.as("order_sku_options"));
  const pagination = paginateTable(totals.total, data.page, data.pageSize);
  const rows = await base.orderBy(asc(products.name), asc(productSellUnits.id)).limit(data.pageSize).offset(pagination.offset);
  const balances = rows.length ? await db.select({ productId: salesInventory.productId, physical: salesInventory.quantity, reserved: salesInventory.reservedQuantity,
    available: sql<string>`(${salesInventory.quantity} - ${salesInventory.reservedQuantity})::text` }).from(salesInventory)
    .where(and(eq(salesInventory.organizationId, orgId), eq(salesInventory.salesId, data.salesId), eq(salesInventory.warehouseId, data.warehouseId),
      notDeleted(salesInventory), inArray(salesInventory.productId, rows.map((row) => row.productId)))) : [];
  const byProduct = new Map(balances.map((row) => [row.productId, row]));
  return { rows: rows.map((row) => ({ ...row, available: byProduct.get(row.productId)?.available ?? "0", physical: byProduct.get(row.productId)?.physical ?? "0", reserved: byProduct.get(row.productId)?.reserved ?? "0" })), pagination };
}
