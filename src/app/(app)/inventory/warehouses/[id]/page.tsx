import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { notDeleted, products, productUnits, stockMovementItems, stockMovements, users, warehouses } from "@/db/schema";
import { can, requirePermission } from "@/lib/auth";
import { STOCK_PATH, stockQuantity, stockMovementLabel, stockStatusLabel } from "@/lib/stock";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";
import { StockDetailControls } from "./stock-detail-controls";
import { StockCorrection } from "./stock-correction";

export default async function StockDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("warehouse_movements");
  const orgId = user.organization.id;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const source = alias(warehouses, "source");
  const destination = alias(warehouses, "destination");
  const [movement] = await db.select({
    type: stockMovements.type, status: stockMovements.status, number: stockMovements.transactionNumber,
    date: stockMovements.transactionDate, reference: stockMovements.referenceNumber,
    source: source.name, destination: destination.name, actor: users.name,
    reversalOfId: stockMovements.reversalOfId, replacementOfId: stockMovements.replacementOfId,
    reason: stockMovements.correctionReason,
  }).from(stockMovements)
    .leftJoin(source, and(eq(stockMovements.sourceWarehouseId, source.id), eq(source.organizationId, orgId)))
    .leftJoin(destination, and(eq(stockMovements.destinationWarehouseId, destination.id), eq(destination.organizationId, orgId)))
    .leftJoin(users, and(eq(stockMovements.inputById, users.id), eq(users.organizationId, orgId)))
    .where(and(eq(stockMovements.id, id), eq(stockMovements.organizationId, orgId), notDeleted(stockMovements))).limit(1);
  if (!movement) notFound();
  const related = await db.select({
    id: stockMovements.id, number: stockMovements.transactionNumber, type: stockMovements.type, status: stockMovements.status,
    reversalOfId: stockMovements.reversalOfId, replacementOfId: stockMovements.replacementOfId,
    reason: stockMovements.correctionReason,
  }).from(stockMovements).where(and(
    eq(stockMovements.organizationId, orgId), notDeleted(stockMovements),
    or(eq(stockMovements.id, movement.reversalOfId ?? -1), eq(stockMovements.id, movement.replacementOfId ?? -1),
      eq(stockMovements.reversalOfId, id), eq(stockMovements.replacementOfId, id),
      movement.reversalOfId ? eq(stockMovements.replacementOfId, movement.reversalOfId) : undefined),
  )).orderBy(asc(stockMovements.id));
  const original = related.find((row) => row.id === movement.reversalOfId);
  const reversalReason = movement.reason ?? related.find((row) => row.reversalOfId === id)?.reason;
  const canCorrect = can(user, "warehouse_stock_corrections");
  const title = stockMovementLabel(movement.type, original?.type);
  const replacementForId = movement.reversalOfId ?? id;
  const replacementStatus = movement.reversalOfId ? original?.status : movement.status;
  const { q, page, pageSize } = loadTableQuery(await searchParams);
  const filters = and(eq(stockMovementItems.stockMovementId, id), eq(stockMovementItems.organizationId, orgId),
    notDeleted(stockMovementItems), tableSearch(q, products.name, products.code));
  const base = db.select({
    id: stockMovementItems.id, name: products.name, code: products.code, quantity: stockMovementItems.quantity, unit: productUnits.name,
  }).from(stockMovementItems)
    .leftJoin(products, and(eq(stockMovementItems.productId, products.id), eq(products.organizationId, orgId)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, orgId)))
    .where(filters).$dynamic();
  const [totals] = await db.select({ total: count() }).from(base.as("lines"));
  const pagination = paginateTable(totals.total, page, pageSize);
  const rows = await base.orderBy(asc(stockMovementItems.id)).limit(pageSize).offset(pagination.offset);
  return <div className="space-y-3">
    <PageHeader title={title} description={movement.number ?? `Transaksi #${id}`}>
      <Button variant="outline" render={<Link href={`${STOCK_PATH}?tab=history`} />} nativeButton={false}>Riwayat Transaksi</Button>
      {canCorrect && <StockCorrection id={id} number={movement.number} type={movement.type}
        allowReverse={movement.status === "completed" && !movement.reversalOfId}
        replacementForId={replacementForId}
        allowReplacement={replacementStatus === "reversed" && !related.some((row) => row.replacementOfId === replacementForId)} />}
    </PageHeader>
    <Card size="sm"><CardContent className="grid gap-4 text-sm sm:grid-cols-3">
      <div><p className="text-muted-foreground text-xs">Tanggal</p>{movement.date ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Gudang asal</p>{movement.source ?? "Eksternal"}</div>
      <div><p className="text-muted-foreground text-xs">Gudang tujuan</p>{movement.destination ?? "Eksternal"}</div>
      <div><p className="text-muted-foreground text-xs">Referensi</p>{movement.reference ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Dicatat oleh</p>{movement.actor ?? "—"}</div>
      <div><p className="text-muted-foreground text-xs">Status</p>{stockStatusLabel(movement.status)}</div>
    </CardContent></Card>
    {reversalReason && <p className="bg-muted rounded-lg border p-3 text-sm">
      <span className="font-medium">Alasan pembalikan</span><span className="mt-1 block whitespace-pre-wrap">{reversalReason}</span>
    </p>}
    {related.length > 0 && <div className="flex flex-wrap gap-3 rounded-lg border p-3 text-sm">
      {related.map((row) => <div key={row.id}>
        <p className="text-muted-foreground text-xs">{row.id === movement.reversalOfId ? "Transaksi asal"
          : row.id === movement.replacementOfId ? "Menggantikan" : row.reversalOfId === id ? "Dokumen pembalikan" : "Transaksi pengganti"}</p>
        <Link className="font-medium underline underline-offset-4" href={`${STOCK_PATH}/${row.id}`}>{row.number ?? `#${row.id}`}</Link>
      </div>)}
    </div>}
    <StockDetailControls pagination={pagination}>
      <div className="overflow-hidden rounded-xl border"><Table>
        <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Satuan dasar</TableHead></TableRow></TableHeader>
        <TableBody>{rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-6 text-center">Tidak ada SKU yang cocok.</TableCell></TableRow>}
          {rows.map((row) => <TableRow key={row.id}><TableCell>{row.code ?? "—"}</TableCell><TableCell>{row.name ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell><TableCell>{row.unit ?? "—"}</TableCell></TableRow>)}
        </TableBody>
      </Table></div>
    </StockDetailControls>
  </div>;
}
