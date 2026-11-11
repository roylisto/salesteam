"use server";

import { createHash } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { brands, notDeleted, products, productTypes, productUnits, stockMovementItems, stockMovements, warehouses, warehouseStocks } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { quantityMicros, STOCK_PATH, type StockProduct } from "@/lib/stock";
import { paginateTable, PAGE_SIZES } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { nextWarehouseMovementNumber } from "@/lib/stock-number";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const quantityPattern = /^\d{1,14}(\.\d{1,6})?$/;
const quantity = z.string().trim().refine((value) =>
  quantityPattern.test(value) && quantityMicros(value) > BigInt(0));
const inputSchema = z.object({
  requestKey: z.string().uuid(),
  type: z.enum(["in", "out"]),
  warehouseId: id,
  destinationId: id.optional(),
  date: z.iso.date(),
  reference: z.string().trim().max(60),
  items: z.array(z.object({ productId: id, quantity })).min(1).max(10_000),
}).refine((input) => input.type === "in" || (input.destinationId && input.destinationId !== input.warehouseId));

class StockError extends Error {}

export async function saveWarehouseStock(input: unknown): Promise<{ id?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_movements")) return { error: "Anda tidak memiliki izin Stok Gudang." };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "Periksa gudang, tanggal, dan qty. Isi minimal satu SKU dengan qty positif, maksimal enam desimal." };
  const data = parsed.data;
  const items = [...data.items].sort((a, b) => a.productId - b.productId);
  if (new Set(items.map((item) => item.productId)).size !== items.length) return { error: "SKU yang sama hanya boleh dimasukkan sekali." };
  const requestHash = createHash("sha256").update(JSON.stringify({ ...data, items, requestKey: undefined })).digest("hex");
  const orgId = user.organization.id;
  try {
    const movementId = await db.transaction(async (tx) => {
      // Same lock as catalog mutations keeps product/unit definitions stable while posting.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`catalog:${orgId}`}, 0))`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`inventory:${orgId}`}, 0))`);
      const [previous] = await tx.select().from(stockMovements).where(and(
        eq(stockMovements.organizationId, orgId), eq(stockMovements.requestKey, data.requestKey),
      )).limit(1);
      if (previous) {
        if (previous.requestHash !== requestHash || previous.deletedAt) throw new StockError("Permintaan ini sudah diproses dengan data berbeda. Muat ulang formulir.");
        return previous.id;
      }

      const warehouseIds = data.type === "out" ? [data.warehouseId, data.destinationId!] : [data.warehouseId];
      const locations = await tx.select().from(warehouses).where(and(
        eq(warehouses.organizationId, orgId), inArray(warehouses.id, warehouseIds),
        eq(warehouses.isActive, true), notDeleted(warehouses),
      )).orderBy(asc(warehouses.id)).for("update");
      if (locations.length !== warehouseIds.length) throw new StockError("Pilih gudang aktif yang valid.");
      const productRows = await tx.select({
        id: products.id, name: products.name, allowFraction: productUnits.allowFraction,
      }).from(products).innerJoin(productUnits, and(
        eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId),
        notDeleted(productUnits), eq(productUnits.isActive, true),
      )).where(and(eq(products.organizationId, orgId), inArray(products.id, items.map((item) => item.productId)),
        notDeleted(products), eq(products.status, "active")));
      if (productRows.length !== items.length) throw new StockError("Ada SKU atau satuan dasar yang sudah tidak aktif. Periksa pilihan SKU.");
      const productMap = new Map(productRows.map((product) => [product.id, product]));
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        if (!product.allowFraction && quantityMicros(item.quantity) % BigInt(1_000_000) !== BigInt(0)) {
          throw new StockError(`Qty ${product.name} harus berupa bilangan bulat sesuai satuan dasarnya.`);
        }
      }
      if (data.type === "out") {
        const balances = await tx.select().from(warehouseStocks).where(and(
          eq(warehouseStocks.organizationId, orgId), eq(warehouseStocks.warehouseId, data.warehouseId),
          inArray(warehouseStocks.productId, items.map((item) => item.productId)), notDeleted(warehouseStocks),
        )).for("update");
        const available = new Map(balances.map((row) => [row.productId, row.quantity]));
        for (const item of items) {
          if (quantityMicros(available.get(item.productId) ?? "0") < quantityMicros(item.quantity)) {
            throw new StockError(`Stok ${productMap.get(item.productId)!.name} di gudang asal tidak mencukupi.`);
          }
        }
        const requested = sql.join(items.map((item) => sql`(${item.productId}::bigint, ${item.quantity}::numeric)`), sql`, `);
        const removed = await tx.execute(sql`
          update warehouse_stocks as balance
          set quantity = balance.quantity - requested.quantity, updated_at = now()
          from (values ${requested}) as requested(product_id, quantity)
          where balance.organization_id = ${orgId} and balance.warehouse_id = ${data.warehouseId}
            and balance.product_id = requested.product_id and balance.deleted_at is null
            and balance.quantity >= requested.quantity
          returning balance.id
        `);
        if (removed.length !== items.length) throw new StockError("Saldo gudang asal berubah. Muat ulang dan coba lagi.");
      }
      const receivingWarehouse = data.type === "in" ? data.warehouseId : data.destinationId!;
      const received = await tx.insert(warehouseStocks).values(items.map((item) => ({
        organizationId: orgId, warehouseId: receivingWarehouse, productId: item.productId, quantity: item.quantity,
      }))).onConflictDoUpdate({
        target: [warehouseStocks.warehouseId, warehouseStocks.productId],
        targetWhere: sql`${warehouseStocks.deletedAt} is null`,
        set: { quantity: sql`${warehouseStocks.quantity} + excluded.quantity` },
        setWhere: eq(warehouseStocks.organizationId, orgId),
      }).returning({ id: warehouseStocks.id });
      if (received.length !== items.length) throw new StockError("Saldo gudang tujuan tidak dapat diperbarui.");
      const transactionNumber = await nextWarehouseMovementNumber(tx, orgId, data.warehouseId, data.type);
      const [movement] = await tx.insert(stockMovements).values({
        organizationId: orgId, type: data.type, status: "completed", transactionDate: data.date,
        transactionNumber,
        referenceNumber: data.reference || null, requestKey: data.requestKey, requestHash,
        sourceWarehouseId: data.type === "out" ? data.warehouseId : null,
        destinationWarehouseId: data.type === "in" ? data.warehouseId : data.destinationId,
        inputById: user.id,
      }).returning();
      await tx.insert(stockMovementItems).values(items.map((item) => ({
        organizationId: orgId, stockMovementId: movement.id, productId: item.productId, quantity: item.quantity,
      })));
      const source = locations.find((location) => location.id === data.warehouseId)!;
      const destination = locations.find((location) => location.id === data.destinationId);
      await recordAudit(tx, user, "warehouse_movements", "create", {
        id: movement.id, name: `${data.type === "in" ? "Stock In" : "Stock Out"} · ${source.name}${destination ? ` → ${destination.name}` : ""} · ${items.length} SKU`,
      });
      return movement.id;
    });
    revalidatePath(STOCK_PATH);
    return { id: movementId };
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    console.error("Warehouse stock transaction failed", error instanceof Error ? error.name : "unknown");
    return { error: "Transaksi stok gagal disimpan. Periksa koneksi dan coba lagi." };
  }
}

const productQuery = z.object({
  warehouseId: id, q: z.string().max(200), scope: z.enum(["all", "type", "brand"]),
  scopeId: id.optional(), page: z.number().int().positive(), pageSize: z.union(PAGE_SIZES.map((size) => z.literal(size))),
}).refine((input) => input.scope === "all" || input.scopeId !== undefined);

export async function loadStockProducts(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_movements")) throw new Error("Akses ditolak.");
  const parsed = productQuery.safeParse(input);
  if (!parsed.success) throw new Error("Pilih filter SKU yang valid.");
  const { warehouseId, q, scope, scopeId, page, pageSize } = parsed.data;
  const orgId = user.organization.id;
  const filters = and(eq(products.organizationId, orgId), notDeleted(products), eq(products.status, "active"),
    tableSearch(q, products.name, products.code),
    scope === "type" ? eq(products.productTypeId, scopeId!) : undefined,
    scope === "brand" ? eq(products.brandId, scopeId!) : undefined,
    sql`exists (select 1 from ${warehouses} where ${warehouses.id} = ${warehouseId} and ${warehouses.organizationId} = ${orgId}
      and ${notDeleted(warehouses)} and ${warehouses.isActive} = true)`,
  );
  const joinedUnits = and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits), eq(productUnits.isActive, true));
  const [totals] = await db.select({ total: count() }).from(products).innerJoin(productUnits, joinedUnits).where(filters);
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows: StockProduct[] = await db.select({
    id: products.id, code: products.code, name: products.name, brand: brands.name, type: productTypes.name,
    unit: productUnits.name, allowFraction: productUnits.allowFraction, quantity: sql<string>`coalesce(${warehouseStocks.quantity}, 0)::text`,
  }).from(products).innerJoin(productUnits, joinedUnits)
    .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.organizationId, orgId), notDeleted(brands)))
    .leftJoin(productTypes, and(eq(products.productTypeId, productTypes.id), eq(productTypes.organizationId, orgId), notDeleted(productTypes)))
    .leftJoin(warehouseStocks, and(eq(warehouseStocks.productId, products.id), eq(warehouseStocks.warehouseId, warehouseId),
      eq(warehouseStocks.organizationId, orgId), notDeleted(warehouseStocks)))
    .where(filters).orderBy(asc(products.name), asc(products.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}
