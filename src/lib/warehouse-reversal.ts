import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { notDeleted, products, productUnits, stockMovementItems, stockMovements } from "@/db/schema";

/** One row per original SKU, net of all completed cancellation documents. */
export function warehouseReversalQuery(db: Pick<Database, "select">, orgId: number, movementId: number) {
  const original = db.select({
    productId: stockMovementItems.productId,
    quantity: sql<string>`sum(${stockMovementItems.quantity})`.as("original_quantity"),
  }).from(stockMovementItems).where(and(eq(stockMovementItems.organizationId, orgId),
    eq(stockMovementItems.stockMovementId, movementId), notDeleted(stockMovementItems)))
    .groupBy(stockMovementItems.productId).as("original_lines");
  const reversed = db.select({
    productId: stockMovementItems.productId,
    quantity: sql<string>`sum(${stockMovementItems.quantity})`.as("reversed_quantity"),
  }).from(stockMovementItems).innerJoin(stockMovements, and(
    eq(stockMovementItems.stockMovementId, stockMovements.id), eq(stockMovements.organizationId, orgId),
    eq(stockMovements.reversalOfId, movementId), eq(stockMovements.status, "completed"), notDeleted(stockMovements),
  )).where(and(eq(stockMovementItems.organizationId, orgId), notDeleted(stockMovementItems)))
    .groupBy(stockMovementItems.productId).as("reversed_lines");
  return db.select({
    productId: original.productId, name: products.name, code: products.code,
    unit: productUnits.name, allowFraction: productUnits.allowFraction,
    quantity: sql<string>`${original.quantity}::text`,
    cancelled: sql<string>`coalesce(${reversed.quantity}, 0)::text`,
    remaining: sql<string>`(${original.quantity} - coalesce(${reversed.quantity}, 0))::text`,
  }).from(original)
    .leftJoin(reversed, eq(original.productId, reversed.productId))
    .leftJoin(products, and(eq(products.id, original.productId), eq(products.organizationId, orgId)))
    .leftJoin(productUnits, and(eq(productUnits.id, products.baseUnitId), eq(productUnits.organizationId, orgId)))
    .orderBy(asc(original.productId)).$dynamic();
}
