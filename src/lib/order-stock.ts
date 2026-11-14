import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { notDeleted, orderItems, orderStockAllocations, salesInventory } from "@/db/schema";
import { StockError, type StockTransaction } from "@/lib/warehouse-stock-mutation";
import { quantityMicros } from "@/lib/stock";

export async function reserveOrderStock(tx: StockTransaction, order: { id: number; organizationId: number; salesId: number | null; warehouseId: number | null }) {
  const items = await tx.select({ productId: orderItems.productId, quantity: sql<string>`sum(${orderItems.baseQuantity})::text` })
    .from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.organizationId, order.organizationId), notDeleted(orderItems)))
    .groupBy(orderItems.productId);
  if (!items.length || !order.salesId || !order.warehouseId) throw new StockError("Order tidak memiliki sumber stok atau rincian SKU yang valid.");
  const balances = await tx.select().from(salesInventory).where(and(
    eq(salesInventory.organizationId, order.organizationId), eq(salesInventory.salesId, order.salesId),
    eq(salesInventory.warehouseId, order.warehouseId), notDeleted(salesInventory), inArray(salesInventory.productId, items.map((item) => item.productId)),
  )).orderBy(asc(salesInventory.id)).for("update");
  const byProduct = new Map(balances.map((balance) => [balance.productId, balance]));
  for (const item of items) {
    const balance = byProduct.get(item.productId);
    if (!item.quantity || quantityMicros(item.quantity) <= BigInt(0) || !balance || quantityMicros(balance.quantity) - quantityMicros(balance.reservedQuantity) < quantityMicros(item.quantity)) {
      throw new StockError("Stok Sales tersedia tidak mencukupi. Periksa saldo tersedia dari gudang asal yang dipilih.");
    }
    const [changed] = await tx.update(salesInventory).set({ reservedQuantity: sql`${salesInventory.reservedQuantity} + ${item.quantity}::numeric` })
      .where(and(eq(salesInventory.id, balance.id), eq(salesInventory.organizationId, order.organizationId),
        sql`${salesInventory.quantity} - ${salesInventory.reservedQuantity} >= ${item.quantity}::numeric`)).returning({ id: salesInventory.id });
    if (!changed) throw new StockError("Stok tersedia berubah. Muat ulang dan coba lagi.");
  }
  await tx.insert(orderStockAllocations).values(items.map((item) => ({
    organizationId: order.organizationId, orderId: order.id, salesInventoryId: byProduct.get(item.productId)!.id, quantity: item.quantity,
  })));
}

export async function releaseOrderStock(tx: StockTransaction, orgId: number, orderId: number, deliver: boolean) {
  const rows = await tx.select().from(orderStockAllocations).where(and(
    eq(orderStockAllocations.organizationId, orgId), eq(orderStockAllocations.orderId, orderId), notDeleted(orderStockAllocations),
  )).orderBy(asc(orderStockAllocations.salesInventoryId));
  if (!rows.length) throw new StockError("Alokasi stok order tidak tersedia.");
  for (const row of rows) {
    const [changed] = await tx.update(salesInventory).set({
      reservedQuantity: sql`${salesInventory.reservedQuantity} - ${row.quantity}::numeric`,
      ...(deliver ? { quantity: sql`${salesInventory.quantity} - ${row.quantity}::numeric` } : {}),
    }).where(and(eq(salesInventory.id, row.salesInventoryId), eq(salesInventory.organizationId, orgId), notDeleted(salesInventory),
      sql`${salesInventory.reservedQuantity} >= ${row.quantity}::numeric`, sql`${salesInventory.quantity} >= ${salesInventory.reservedQuantity}`))
      .returning({ id: salesInventory.id });
    if (!changed) throw new StockError("Alokasi stok Sales tidak konsisten. Transaksi dibatalkan tanpa mengubah saldo.");
  }
}
