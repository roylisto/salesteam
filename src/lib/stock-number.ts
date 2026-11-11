import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "@/db";
import { stockMovementCounters } from "@/db/schema";

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
