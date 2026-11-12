"use server";

import { createHash } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { brands, notDeleted, products, productTypes, productUnits, salesInventory, salesStockItems, salesStocks, stockMovementItems, stockMovements, users, warehouses, warehouseStocks } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { salesStockOwner } from "@/lib/sales-stock-policy";
import { nextSalesStockNumber, nextWarehouseMovementNumber } from "@/lib/stock-number";
import { quantityMicros, SALES_STOCK_PATH, STOCK_PATH, type StockProduct } from "@/lib/stock";
import { PAGE_SIZES, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { applyWarehouseStock, lockWarehouseStock, StockError } from "@/lib/warehouse-stock-mutation";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const quantity = z.string().trim().refine((value) => /^\d{1,14}(\.\d{1,6})?$/.test(value) && quantityMicros(value) > BigInt(0));
const inputSchema = z.object({
  requestKey: z.string().uuid(), type: z.enum(["in", "out"]),
  salesId: id, warehouseId: id, date: z.iso.date(), reference: z.string().trim().max(60),
  items: z.array(z.object({ productId: id, quantity })).min(1).max(10_000),
});

export async function saveSalesStock(input: unknown): Promise<{ id?: number; error?: string }> {
  const actor = await getCurrentUser();
  if (!actor || !can(actor, "sales_inventory") || !can(actor, "sales_stock")) return { error: "Anda tidak memiliki izin transaksi Stok Sales." };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "Periksa Sales, gudang, tanggal, dan qty. Isi minimal satu SKU dengan qty positif." };
  const data = parsed.data;
  const owner = salesStockOwner(actor);
  if (owner !== undefined && data.salesId !== owner) return { error: "Anda hanya dapat mengelola stok sendiri." };
  const items = [...data.items].sort((a, b) => a.productId - b.productId);
  if (new Set(items.map((item) => item.productId)).size !== items.length) return { error: "SKU yang sama hanya boleh dimasukkan sekali." };
  const requestHash = createHash("sha256").update(JSON.stringify({ ...data, items, requestKey: undefined })).digest("hex");
  const orgId = actor.organization.id;
  try {
    const savedId = await db.transaction(async (tx) => {
      await lockWarehouseStock(tx, orgId);
      const [previous] = await tx.select().from(salesStocks).where(and(
        eq(salesStocks.organizationId, orgId), eq(salesStocks.requestKey, data.requestKey),
      )).limit(1);
      if (previous) {
        if (previous.requestHash !== requestHash || previous.deletedAt) throw new StockError("Permintaan ini sudah diproses dengan data berbeda.");
        return previous.id;
      }
      const [sales] = await tx.select().from(users).where(and(
        eq(users.id, data.salesId), eq(users.organizationId, orgId), notDeleted(users),
      )).for("update");
      if (!sales || data.type === "in" && (sales.userType !== "sales" || !sales.isActive)) {
        throw new StockError("Pilih pengguna Sales aktif untuk mengambil stok.");
      }
      const productRows = await tx.select({
        id: products.id, name: products.name, allowFraction: productUnits.allowFraction,
      }).from(products).innerJoin(productUnits, and(eq(products.baseUnitId, productUnits.id),
        eq(productUnits.organizationId, orgId), notDeleted(productUnits),
        data.type === "in" ? eq(productUnits.isActive, true) : undefined,
      )).where(and(eq(products.organizationId, orgId), notDeleted(products),
        inArray(products.id, items.map((item) => item.productId)), data.type === "in" ? eq(products.status, "active") : undefined));
      if (productRows.length !== items.length) throw new StockError("Ada SKU atau satuan yang tidak tersedia.");
      const productMap = new Map(productRows.map((product) => [product.id, product]));
      for (const item of items) {
        if (!productMap.get(item.productId)!.allowFraction && quantityMicros(item.quantity) % BigInt(1_000_000) !== BigInt(0)) {
          throw new StockError(`Qty ${productMap.get(item.productId)!.name} harus berupa bilangan bulat.`);
        }
      }
      if (data.type === "out") {
        const balances = await tx.select().from(salesInventory).where(and(
          eq(salesInventory.organizationId, orgId), eq(salesInventory.salesId, data.salesId),
          eq(salesInventory.warehouseId, data.warehouseId), notDeleted(salesInventory),
          inArray(salesInventory.productId, items.map((item) => item.productId)),
        )).for("update");
        const available = new Map(balances.map((row) => [row.productId, row.quantity]));
        for (const item of items) {
          if (quantityMicros(available.get(item.productId) ?? "0") < quantityMicros(item.quantity)) {
            throw new StockError(`Stok Sales untuk ${productMap.get(item.productId)!.name} dari gudang asal ini tidak mencukupi.`);
          }
        }
        const requested = sql.join(items.map((item) => sql`(${item.productId}::bigint, ${item.quantity}::numeric)`), sql`, `);
        const removed = await tx.execute(sql`
          update sales_inventory as balance set quantity = balance.quantity - requested.quantity, updated_at = now()
          from (values ${requested}) as requested(product_id, quantity)
          where balance.organization_id = ${orgId} and balance.sales_id = ${data.salesId}
            and balance.warehouse_id = ${data.warehouseId} and balance.product_id = requested.product_id
            and balance.deleted_at is null and balance.quantity >= requested.quantity returning balance.id
        `);
        if (removed.length !== items.length) throw new StockError("Saldo Sales berubah. Muat ulang dan coba lagi.");
      }
      const locations = await applyWarehouseStock(tx, {
        organizationId: orgId, sourceId: data.type === "in" ? data.warehouseId : null,
        destinationId: data.type === "out" ? data.warehouseId : null,
        items: items.map((item) => ({ ...item, name: productMap.get(item.productId)!.name })), requireActive: data.type === "in",
      });
      if (data.type === "in") {
        const values = sql.join(items.map((item) => sql`(${orgId}::bigint, ${data.salesId}::bigint, ${data.warehouseId}::bigint, ${item.productId}::bigint, ${item.quantity}::numeric)`), sql`, `);
        const added = await tx.execute(sql`
          insert into sales_inventory (organization_id, sales_id, warehouse_id, product_id, quantity)
          values ${values}
          on conflict (sales_id, product_id, (coalesce(warehouse_id, 0))) where deleted_at is null
          do update set quantity = sales_inventory.quantity + excluded.quantity, updated_at = now()
          where sales_inventory.organization_id = ${orgId} returning id
        `);
        if (added.length !== items.length) throw new StockError("Saldo Sales tidak dapat diperbarui.");
      }
      const warehouseType = data.type === "in" ? "out" : "in";
      const warehouseNumber = await nextWarehouseMovementNumber(tx, orgId, data.warehouseId, warehouseType);
      const [warehouseMovement] = await tx.insert(stockMovements).values({
        organizationId: orgId, transactionDate: data.date, transactionNumber: warehouseNumber,
        referenceNumber: data.reference || null, type: warehouseType, status: "completed", inputById: actor.id,
        sourceWarehouseId: data.type === "in" ? data.warehouseId : null,
        destinationWarehouseId: data.type === "out" ? data.warehouseId : null,
      }).returning({ id: stockMovements.id });
      await tx.insert(stockMovementItems).values(items.map((item) => ({
        ...item, organizationId: orgId, stockMovementId: warehouseMovement.id,
      })));
      const number = await nextSalesStockNumber(tx, orgId, data.salesId, data.type);
      const [sale] = await tx.insert(salesStocks).values({
        organizationId: orgId, transactionDate: data.date, transactionNumber: number, type: data.type,
        salesId: data.salesId, warehouseId: data.warehouseId, inputById: actor.id, status: "completed",
        requestKey: data.requestKey, requestHash, referenceNumber: data.reference || null, warehouseMovementId: warehouseMovement.id,
      }).returning({ id: salesStocks.id });
      await tx.insert(salesStockItems).values(items.map((item) => ({
        ...item, organizationId: orgId, salesStockId: sale.id,
      })));
      const label = `${data.type === "in" ? "Pengambilan" : "Pengembalian"} · ${sales.name} · ${locations[0].name} · ${items.length} SKU`;
      await recordAudit(tx, actor, "sales_inventory", "create", { id: sale.id, name: `${number} · ${label}` });
      await recordAudit(tx, actor, "warehouse_movements", "create", { id: warehouseMovement.id, name: `${warehouseNumber} · ${label} · ${number}` });
      return sale.id;
    });
    revalidatePath(SALES_STOCK_PATH);
    revalidatePath(STOCK_PATH);
    return { id: savedId };
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    console.error("Sales stock transaction failed", error instanceof Error ? error.name : "unknown");
    return { error: "Transaksi Stok Sales gagal disimpan. Coba lagi dengan data yang sama." };
  }
}

const querySchema = z.object({
  salesId: id, warehouseId: id, type: z.enum(["in", "out"]), q: z.string().max(200),
  scope: z.enum(["all", "type", "brand"]), scopeId: id.optional(),
  page: z.number().int().positive(), pageSize: z.union(PAGE_SIZES.map((size) => z.literal(size))),
}).refine((value) => value.scope === "all" || value.scopeId !== undefined);

export async function loadSalesStockProducts(input: unknown) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor, "sales_inventory") || !can(actor, "sales_stock")) throw new Error("Akses ditolak.");
  const { salesId, warehouseId, type, q, scope, scopeId, page, pageSize } = querySchema.parse(input);
  const owner = salesStockOwner(actor);
  if (owner !== undefined && owner !== salesId) throw new Error("Akses ditolak.");
  const orgId = actor.organization.id;
  const available = type === "in" ? warehouseStocks.quantity : salesInventory.quantity;
  const base = db.select({
    id: products.id, name: products.name, code: products.code, brand: brands.name, type: productTypes.name,
    unit: productUnits.name, allowFraction: productUnits.allowFraction, quantity: sql<string>`${available}::text`,
  }).from(products)
    .innerJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits)))
    .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.organizationId, orgId), notDeleted(brands)))
    .leftJoin(productTypes, and(eq(products.productTypeId, productTypes.id), eq(productTypes.organizationId, orgId), notDeleted(productTypes)))
    .leftJoin(warehouseStocks, and(eq(warehouseStocks.productId, products.id), eq(warehouseStocks.organizationId, orgId),
      eq(warehouseStocks.warehouseId, warehouseId), notDeleted(warehouseStocks)))
    .leftJoin(salesInventory, and(eq(salesInventory.productId, products.id), eq(salesInventory.organizationId, orgId),
      eq(salesInventory.salesId, salesId), eq(salesInventory.warehouseId, warehouseId), notDeleted(salesInventory)))
    .where(and(eq(products.organizationId, orgId), notDeleted(products),
      type === "in" ? eq(products.status, "active") : undefined, sql`${available} > 0`,
      tableSearch(q, products.name, products.code),
      scope === "brand" ? eq(products.brandId, scopeId!) : undefined, scope === "type" ? eq(products.productTypeId, scopeId!) : undefined,
      sql`exists (select 1 from ${users} where ${users.id} = ${salesId} and ${users.organizationId} = ${orgId}
        and ${notDeleted(users)})`,
      sql`exists (select 1 from ${warehouses} where ${warehouses.id} = ${warehouseId} and ${warehouses.organizationId} = ${orgId}
        and ${notDeleted(warehouses)})`,
    )).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("available_sales_products"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows: StockProduct[] = await base.orderBy(asc(products.name), asc(products.id)).limit(pageSize).offset(pagination.offset);
  return { rows, pagination };
}
