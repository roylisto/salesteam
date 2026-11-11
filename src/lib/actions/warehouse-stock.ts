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
import { applyWarehouseStock, lockWarehouseStock, StockError } from "@/lib/warehouse-stock-mutation";

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
  replacementOfId: id.optional(),
}).refine((input) => input.type === "in" || (input.destinationId && input.destinationId !== input.warehouseId));

export async function saveWarehouseStock(input: unknown): Promise<{ id?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_movements")) return { error: "Anda tidak memiliki izin Stok Gudang." };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "Periksa gudang, tanggal, dan qty. Isi minimal satu SKU dengan qty positif, maksimal enam desimal." };
  const data = parsed.data;
  if (data.replacementOfId && !can(user, "warehouse_stock_corrections")) return { error: "Anda tidak memiliki izin Koreksi Stok Gudang." };
  const items = [...data.items].sort((a, b) => a.productId - b.productId);
  if (new Set(items.map((item) => item.productId)).size !== items.length) return { error: "SKU yang sama hanya boleh dimasukkan sekali." };
  const requestHash = createHash("sha256").update(JSON.stringify({ ...data, items, requestKey: undefined })).digest("hex");
  const orgId = user.organization.id;
  try {
    const movementId = await db.transaction(async (tx) => {
      await lockWarehouseStock(tx, orgId);
      const [previous] = await tx.select().from(stockMovements).where(and(
        eq(stockMovements.organizationId, orgId), eq(stockMovements.requestKey, data.requestKey),
      )).limit(1);
      if (previous) {
        if (previous.requestHash !== requestHash || previous.deletedAt) throw new StockError("Permintaan ini sudah diproses dengan data berbeda. Muat ulang formulir.");
        return previous.id;
      }
      let replacedNumber: string | null = null;
      if (data.replacementOfId) {
        const [original] = await tx.select().from(stockMovements).where(and(
          eq(stockMovements.id, data.replacementOfId), eq(stockMovements.organizationId, orgId), notDeleted(stockMovements),
        )).for("update");
        if (!original || original.status !== "reversed" || original.reversalOfId || original.type !== data.type) {
          throw new StockError("Pilih transaksi asal yang sudah dibatalkan dengan jenis Stock In/Out yang sesuai.");
        }
        const [replacement] = await tx.select({ id: stockMovements.id }).from(stockMovements).where(and(
          eq(stockMovements.organizationId, orgId), eq(stockMovements.replacementOfId, original.id),
        )).limit(1);
        if (replacement) throw new StockError("Transaksi ini sudah memiliki pengganti. Buka detail transaksi penggantinya.");
        replacedNumber = original.transactionNumber ?? `#${original.id}`;
      }

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
      const locations = await applyWarehouseStock(tx, {
        organizationId: orgId, sourceId: data.type === "out" ? data.warehouseId : null,
        destinationId: data.type === "in" ? data.warehouseId : data.destinationId!,
        items: items.map((item) => ({ ...item, name: productMap.get(item.productId)!.name })), requireActive: true,
      });
      const transactionNumber = await nextWarehouseMovementNumber(tx, orgId, data.warehouseId, data.type);
      const [movement] = await tx.insert(stockMovements).values({
        organizationId: orgId, type: data.type, status: "completed", transactionDate: data.date,
        transactionNumber,
        referenceNumber: data.reference || null, requestKey: data.requestKey, requestHash,
        replacementOfId: data.replacementOfId,
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
        id: movement.id, name: `${transactionNumber} · ${data.type === "in" ? "Stock In" : "Stock Out"} · ${source.name}${destination ? ` → ${destination.name}` : ""} · ${items.length} SKU${replacedNumber ? ` · Pengganti ${replacedNumber}` : ""}`,
      });
      return movement.id;
    });
    revalidatePath(STOCK_PATH);
    if (data.replacementOfId) revalidatePath(`${STOCK_PATH}/${data.replacementOfId}`);
    return { id: movementId };
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    console.error("Warehouse stock transaction failed", error instanceof Error ? error.name : "unknown");
    return { error: "Transaksi stok gagal disimpan. Periksa koneksi dan coba lagi." };
  }
}

const reversalSchema = z.object({
  movementId: id, requestKey: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export async function reverseWarehouseStock(input: unknown): Promise<{ id?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_movements") || !can(user, "warehouse_stock_corrections")) {
    return { error: "Anda tidak memiliki izin Koreksi Stok Gudang." };
  }
  const parsed = reversalSchema.safeParse(input);
  if (!parsed.success) return { error: "Alasan pembalikan wajib diisi, maksimal 1.000 karakter." };
  const { movementId, requestKey, reason } = parsed.data;
  const orgId = user.organization.id;
  const requestHash = createHash("sha256").update(JSON.stringify({ action: "reverse", movementId, reason })).digest("hex");
  try {
    const reversalId = await db.transaction(async (tx) => {
      await lockWarehouseStock(tx, orgId);
      const [previous] = await tx.select().from(stockMovements).where(and(
        eq(stockMovements.organizationId, orgId), eq(stockMovements.requestKey, requestKey),
      )).limit(1);
      if (previous) {
        if (previous.requestHash !== requestHash || previous.deletedAt) throw new StockError("Permintaan pembalikan ini sudah diproses dengan data berbeda.");
        return previous.id;
      }
      const [original] = await tx.select().from(stockMovements).where(and(
        eq(stockMovements.id, movementId), eq(stockMovements.organizationId, orgId), notDeleted(stockMovements),
      )).for("update");
      if (!original) throw new StockError("Transaksi stok tidak ditemukan.");
      if (original.reversalOfId) throw new StockError("Dokumen pembalikan tidak dapat dibalik kembali. Buat transaksi pengganti dari transaksi asal.");
      const [existing] = await tx.select().from(stockMovements).where(and(
        eq(stockMovements.organizationId, orgId), eq(stockMovements.reversalOfId, movementId),
      )).limit(1);
      if (existing) {
        if (existing.deletedAt) throw new StockError("Pembalikan sudah tercatat dan perlu diperiksa.");
        return existing.id;
      }
      if (original.status !== "completed") throw new StockError("Hanya transaksi selesai yang dapat dibalik.");
      const grouped = await tx.select({
        productId: stockMovementItems.productId,
        quantity: sql<string>`sum(${stockMovementItems.quantity})::text`,
      }).from(stockMovementItems).where(and(
        eq(stockMovementItems.stockMovementId, movementId), eq(stockMovementItems.organizationId, orgId), notDeleted(stockMovementItems),
      )).groupBy(stockMovementItems.productId).orderBy(asc(stockMovementItems.productId));
      if (grouped.length === 0 || grouped.some((item) => !quantity.safeParse(item.quantity).success)) {
        throw new StockError("Rincian qty transaksi asal tidak valid. Periksa transaksi sebelum pembalikan.");
      }
      const productRows = await tx.select({ id: products.id, name: products.name }).from(products).where(and(
        eq(products.organizationId, orgId), inArray(products.id, grouped.map((item) => item.productId)), notDeleted(products),
      ));
      if (productRows.length !== grouped.length) throw new StockError("Produk transaksi sudah dihapus atau tidak tersedia. Pulihkan produk sebelum pembalikan.");
      const names = new Map(productRows.map((product) => [product.id, product.name]));
      const sourceId = original.destinationWarehouseId;
      const destinationId = original.sourceWarehouseId;
      await applyWarehouseStock(tx, {
        organizationId: orgId, sourceId, destinationId,
        items: grouped.map((item) => ({ ...item, name: names.get(item.productId)! })), requireActive: false,
      });
      const type = original.type === "in" ? "out" : "in";
      const transactionNumber = await nextWarehouseMovementNumber(tx, orgId, (sourceId ?? destinationId)!, type);
      let date: string;
      try {
        date = new Intl.DateTimeFormat("sv-SE", { timeZone: user.organization.timezone }).format(new Date());
      } catch {
        date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
      }
      const [reversal] = await tx.insert(stockMovements).values({
        organizationId: orgId, type, status: "completed", transactionDate: date, transactionNumber,
        referenceNumber: original.referenceNumber, requestKey, requestHash,
        reversalOfId: original.id, correctionReason: reason,
        sourceWarehouseId: sourceId, destinationWarehouseId: destinationId, inputById: user.id,
      }).returning({ id: stockMovements.id });
      await tx.insert(stockMovementItems).values(grouped.map((item) => ({
        ...item, organizationId: orgId, stockMovementId: reversal.id,
      })));
      await tx.update(stockMovements).set({ status: "reversed" }).where(and(
        eq(stockMovements.id, original.id), eq(stockMovements.organizationId, orgId),
      ));
      await recordAudit(tx, user, "warehouse_movements", "reverse", {
        id: original.id, name: `${original.transactionNumber ?? original.id} → ${transactionNumber} · ${reason}`,
      });
      return reversal.id;
    });
    revalidatePath(STOCK_PATH);
    revalidatePath(`${STOCK_PATH}/${movementId}`);
    return { id: reversalId };
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    console.error("Warehouse stock reversal failed", error instanceof Error ? error.name : "unknown");
    return { error: "Pembalikan gagal disimpan. Periksa koneksi dan coba lagi." };
  }
}

const productQuery = z.object({
  warehouseId: id, q: z.string().max(200), scope: z.enum(["all", "type", "brand"]),
  scopeId: id.optional(), page: z.number().int().positive(), pageSize: z.union(PAGE_SIZES.map((size) => z.literal(size))),
  productIds: z.array(id).min(1).max(10_000).optional(),
}).refine((input) => input.scope === "all" || input.scopeId !== undefined);

export async function loadStockProducts(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_movements")) throw new Error("Akses ditolak.");
  const parsed = productQuery.safeParse(input);
  if (!parsed.success) throw new Error("Pilih filter SKU yang valid.");
  const { warehouseId, q, scope, scopeId, page, pageSize, productIds } = parsed.data;
  const orgId = user.organization.id;
  const filters = and(eq(products.organizationId, orgId), notDeleted(products), eq(products.status, "active"),
    tableSearch(q, products.name, products.code),
    productIds ? inArray(products.id, productIds) : undefined,
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
