import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { notDeleted, products, productUnits, salesStockItems, salesStocks, stockMovements, users, warehouses } from "@/db/schema";
import { can, requirePermission } from "@/lib/auth";
import { salesStockOwner } from "@/lib/sales-stock-policy";
import { SALES_STOCK_PATH, STOCK_PATH, stockQuantity, stockStatusLabel } from "@/lib/stock";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { StockDetailControls } from "../../warehouses/[id]/stock-detail-controls";

export default async function SalesStockDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("sales_inventory");
  const orgId = actor.organization.id;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const recorder = alias(users, "recorder");
  const owner = salesStockOwner(actor);
  const [movement] = await db.select({
    type: salesStocks.type, number: salesStocks.transactionNumber, date: salesStocks.transactionDate,
    reference: salesStocks.referenceNumber, status: salesStocks.status,
    sales: users.name, warehouse: warehouses.name, actor: recorder.name,
    warehouseMovementId: salesStocks.warehouseMovementId, warehouseNumber: stockMovements.transactionNumber,
  }).from(salesStocks)
    .leftJoin(users, and(eq(salesStocks.salesId, users.id), eq(users.organizationId, orgId)))
    .leftJoin(recorder, and(eq(salesStocks.inputById, recorder.id), eq(recorder.organizationId, orgId)))
    .leftJoin(warehouses, and(eq(salesStocks.warehouseId, warehouses.id), eq(warehouses.organizationId, orgId)))
    .leftJoin(stockMovements, and(eq(salesStocks.warehouseMovementId, stockMovements.id), eq(stockMovements.organizationId, orgId)))
    .where(and(eq(salesStocks.id, id), eq(salesStocks.organizationId, orgId), notDeleted(salesStocks),
      owner === undefined ? undefined : eq(salesStocks.salesId, owner))).limit(1);
  if (!movement) notFound();
  const { q, page, pageSize } = loadTableQuery(await searchParams);
  const base = db.select({
    id: salesStockItems.id, name: products.name, code: products.code, quantity: salesStockItems.quantity, unit: productUnits.name,
  }).from(salesStockItems)
    .leftJoin(products, and(eq(salesStockItems.productId, products.id), eq(products.organizationId, orgId)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId)))
    .where(and(eq(salesStockItems.salesStockId, id), eq(salesStockItems.organizationId, orgId),
      notDeleted(salesStockItems), tableSearch(q, products.name, products.code))).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("sales_lines"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(asc(salesStockItems.id)).limit(pageSize).offset(pagination.offset);
  return <div className="space-y-3">
    <PageHeader title={movement.type === "in" ? "Pengambilan Stok Sales" : "Pengembalian Stok Sales"} description={movement.number}>
      <Button variant="outline" render={<Link href={`${SALES_STOCK_PATH}?tab=history`} />} nativeButton={false}>Riwayat Transaksi</Button>
    </PageHeader>
    <Card size="sm"><CardContent className="grid gap-4 text-sm sm:grid-cols-3">
      <div><p className="text-muted-foreground text-xs">Sales</p>{movement.sales ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Gudang asal</p>{movement.warehouse ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Tanggal</p>{movement.date}</div>
      <div><p className="text-muted-foreground text-xs">Referensi</p>{movement.reference ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Dicatat oleh</p>{movement.actor ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Status</p>{stockStatusLabel(movement.status)}</div>
    </CardContent></Card>
    {movement.warehouseMovementId && <p className="rounded-lg border p-3 text-sm">Transaksi gudang{" "}
      {can(actor, "warehouse_movements") ? <Link className="font-medium underline underline-offset-4" href={`${STOCK_PATH}/${movement.warehouseMovementId}`}>
        {movement.warehouseNumber}
      </Link> : <span className="font-medium">{movement.warehouseNumber}</span>}
    </p>}
    <StockDetailControls pagination={pagination}>
      <div className="overflow-hidden rounded-xl border"><Table><TableHeader><TableRow>
        <TableHead>SKU</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Satuan dasar</TableHead>
      </TableRow></TableHeader><TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-6 text-center">Tidak ada SKU yang cocok.</TableCell></TableRow>}
        {rows.map((row) => <TableRow key={row.id}><TableCell>{row.code ?? "—"}</TableCell><TableCell>{row.name ?? "—"}</TableCell>
          <TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell><TableCell>{row.unit ?? "—"}</TableCell></TableRow>)}
      </TableBody></Table></div>
    </StockDetailControls>
  </div>;
}
