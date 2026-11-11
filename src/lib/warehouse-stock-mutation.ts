import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { notDeleted, warehouses, warehouseStocks } from "@/db/schema";
import { quantityMicros } from "@/lib/stock";

export type StockTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export class StockError extends Error {}

export async function lockWarehouseStock(tx: StockTransaction, organizationId: number) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`catalog:${organizationId}`}, 0))`);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`inventory:${organizationId}`}, 0))`);
}

export async function applyWarehouseStock(tx: StockTransaction, input: {
  organizationId: number;
  sourceId: number | null;
  destinationId: number | null;
  items: { productId: number; quantity: string; name: string }[];
  requireActive: boolean;
}) {
  const { organizationId, sourceId, destinationId, items, requireActive } = input;
  const warehouseIds = [sourceId, destinationId].filter((id): id is number => id !== null);
  if (warehouseIds.length === 0 || sourceId !== null && sourceId === destinationId) throw new StockError("Gudang asal dan tujuan harus valid dan berbeda.");
  const locations = await tx.select().from(warehouses).where(and(
    eq(warehouses.organizationId, organizationId), inArray(warehouses.id, warehouseIds), notDeleted(warehouses),
    requireActive ? eq(warehouses.isActive, true) : undefined,
  )).orderBy(asc(warehouses.id)).for("update");
  if (locations.length !== warehouseIds.length) throw new StockError(
    requireActive ? "Pilih gudang aktif yang valid." : "Gudang transaksi sudah dihapus atau tidak tersedia. Pulihkan gudang sebelum pembalikan.",
  );
  if (sourceId !== null) {
    const balances = await tx.select().from(warehouseStocks).where(and(
      eq(warehouseStocks.organizationId, organizationId), eq(warehouseStocks.warehouseId, sourceId),
      inArray(warehouseStocks.productId, items.map((item) => item.productId)), notDeleted(warehouseStocks),
    )).for("update");
    const available = new Map(balances.map((row) => [row.productId, row.quantity]));
    for (const item of items) {
      if (quantityMicros(available.get(item.productId) ?? "0") < quantityMicros(item.quantity)) {
        throw new StockError(`Stok ${item.name} di ${locations.find((location) => location.id === sourceId)!.name} tidak mencukupi.`);
      }
    }
    const requested = sql.join(items.map((item) => sql`(${item.productId}::bigint, ${item.quantity}::numeric)`), sql`, `);
    const removed = await tx.execute(sql`
      update warehouse_stocks as balance
      set quantity = balance.quantity - requested.quantity, updated_at = now()
      from (values ${requested}) as requested(product_id, quantity)
      where balance.organization_id = ${organizationId} and balance.warehouse_id = ${sourceId}
        and balance.product_id = requested.product_id and balance.deleted_at is null
        and balance.quantity >= requested.quantity
      returning balance.id
    `);
    if (removed.length !== items.length) throw new StockError("Saldo gudang berubah. Muat ulang dan coba lagi.");
  }
  if (destinationId !== null) {
    const received = await tx.insert(warehouseStocks).values(items.map((item) => ({
      organizationId, warehouseId: destinationId, productId: item.productId, quantity: item.quantity,
    }))).onConflictDoUpdate({
      target: [warehouseStocks.warehouseId, warehouseStocks.productId],
      targetWhere: sql`${warehouseStocks.deletedAt} is null`,
      set: { quantity: sql`${warehouseStocks.quantity} + excluded.quantity` },
      setWhere: eq(warehouseStocks.organizationId, organizationId),
    }).returning({ id: warehouseStocks.id });
    if (received.length !== items.length) throw new StockError("Saldo gudang tujuan tidak dapat diperbarui.");
  }
  return locations;
}
