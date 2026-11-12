import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/db";
import { salesStockCounters, stockMovementCounters } from "@/db/schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function nextWarehouseMovementNumber(
  tx: Transaction,
  organizationId: number,
  warehouseId: number,
  type: "in" | "out",
) {
  const [counter] = await tx.insert(stockMovementCounters).values({
    organizationId,
    warehouseId,
    type,
    lastNumber: BigInt(1),
  }).onConflictDoUpdate({
    target: [stockMovementCounters.organizationId, stockMovementCounters.warehouseId, stockMovementCounters.type],
    set: { lastNumber: sql`${stockMovementCounters.lastNumber} + 1` },
  }).returning({ number: stockMovementCounters.lastNumber });

  const organizationCode = BigInt(organizationId).toString(36).toUpperCase();
  const warehouseCode = BigInt(warehouseId).toString(36).toUpperCase();
  const sequence = counter.number.toString().padStart(6, "0");
  return `W-${type.toUpperCase()}-O${organizationCode}-G${warehouseCode}-${sequence}`;
}

export async function nextSalesStockNumber(tx: Transaction, organizationId: number, salesId: number, type: "in" | "out") {
  const [counter] = await tx.insert(salesStockCounters).values({
    organizationId, salesId, type, lastNumber: BigInt(1),
  }).onConflictDoUpdate({
    target: [salesStockCounters.organizationId, salesStockCounters.salesId, salesStockCounters.type],
    set: { lastNumber: sql`${salesStockCounters.lastNumber} + 1` },
  }).returning({ number: salesStockCounters.lastNumber });
  return `S-${type.toUpperCase()}-O${BigInt(organizationId).toString(36).toUpperCase()}-U${BigInt(salesId).toString(36).toUpperCase()}-${counter.number.toString().padStart(6, "0")}`;
}
