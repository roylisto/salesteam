import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notDeleted, stockMovements, stockMovementItems } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { STOCK_PATH, type StockReplacement } from "@/lib/stock";
import { stockOptions } from "../data";
import { StockForm } from "./stock-form";

export default async function NewStockPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("warehouse_movements");
  const params = await searchParams;
  let type: "in" | "out" = params.type === "out" ? "out" : "in";
  let replacement: StockReplacement | undefined;
  if (params.replace !== undefined) {
    await requirePermission("warehouse_stock_corrections");
    const replaceId = typeof params.replace === "string" ? Number(params.replace) : NaN;
    if (!Number.isSafeInteger(replaceId) || replaceId <= 0) notFound();
    const orgId = user.organization.id;
    const [original] = await db.select().from(stockMovements).where(and(
      eq(stockMovements.id, replaceId), eq(stockMovements.organizationId, orgId), notDeleted(stockMovements),
    )).limit(1);
    if (!original || original.status !== "reversed" || original.reversalOfId) notFound();
    const [existing] = await db.select({ id: stockMovements.id }).from(stockMovements).where(and(
      eq(stockMovements.organizationId, orgId), eq(stockMovements.replacementOfId, original.id),
    )).limit(1);
    if (existing) redirect(`${STOCK_PATH}/${existing.id}`);
    const items = await db.select({
      productId: stockMovementItems.productId, quantity: sql<string>`sum(${stockMovementItems.quantity})::text`,
    }).from(stockMovementItems).where(and(
      eq(stockMovementItems.stockMovementId, original.id), eq(stockMovementItems.organizationId, orgId), notDeleted(stockMovementItems),
    )).groupBy(stockMovementItems.productId);
    type = original.type;
    replacement = {
      id: original.id, number: original.transactionNumber,
      warehouseId: type === "in" ? original.destinationWarehouseId : original.sourceWarehouseId,
      destinationId: type === "out" ? original.destinationWarehouseId : null,
      reference: original.referenceNumber,
      quantities: Object.fromEntries(items.map((item) => [item.productId, item.quantity])),
    };
  }
  const options = await stockOptions(user.organization.id, true);
  let date: string;
  try {
    date = new Intl.DateTimeFormat("sv-SE", { timeZone: user.organization.timezone }).format(new Date());
  } catch {
    date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
  }
  return <div className="w-full">
    <PageHeader title={`${replacement ? "Pengganti " : ""}${type === "in" ? "Stock In" : "Stock Out"}`}
      description={type === "in" ? "Catat penerimaan barang ke gudang." : "Transfer barang dari gudang asal ke gudang tujuan."}>
      <Button variant="outline" render={<Link href={STOCK_PATH} />} nativeButton={false}>Kembali</Button>
    </PageHeader>
    <StockForm key={`${type}-${replacement?.id ?? "new"}`} type={type} options={options} defaultDate={date} replacement={replacement} />
  </div>;
}
