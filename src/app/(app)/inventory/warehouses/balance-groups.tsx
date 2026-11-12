"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PackageIcon, WarehouseIcon } from "lucide-react";
import { useActionProgress } from "@/components/action-progress";
import { Button } from "@/components/ui/button";
import { ServerTablePagination } from "@/components/server-table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadWarehouseBalance } from "@/lib/actions/warehouse-stock";
import { toFileSrc } from "@/lib/files";
import { stockQuantity } from "@/lib/stock";
import type { PageSize } from "@/lib/table-query";
import type { stockBalance } from "./data";

type Filters = { q: string; brandId?: number; typeId?: number };

function Thumbnail({ image }: { image: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = toFileSrc(image);
  return src && !failed ? <Image src={`${src}?thumbnail=catalog`} alt="" width={40} height={40} unoptimized
    className="size-10 shrink-0 rounded-md border object-cover" onError={() => setFailed(true)} />
    : <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border"><PackageIcon className="size-4" /></span>;
}

function WarehouseDetails({ warehouseId, filters }: { warehouseId: number; filters: Filters }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadWarehouseBalance>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useActionProgress(loading);
  const { q, brandId, typeId } = filters;
  useEffect(() => {
    let disposed = false;
    void loadWarehouseBalance({ warehouseId, q, brandId, typeId, page, pageSize }).then((data) => {
      if (!disposed) setResult(data);
    }).catch(() => { if (!disposed) setError("Rincian stok gagal dimuat."); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [warehouseId, q, brandId, typeId, page, pageSize, retry]);
  function changePage(value: number) { setLoading(true); setPage(value); }
  return <div className="space-y-3 border-t p-3" aria-busy={loading}>
    {loading && <p role="status" className="text-muted-foreground text-sm">Memuat stok per SKU…</p>}
    {error && <div className="flex items-center gap-2"><p role="alert" className="text-destructive text-sm">{error}</p>
      <Button variant="outline" size="sm" onClick={() => { setError(""); setLoading(true); setRetry((value) => value + 1); }}>Coba lagi</Button></div>}
    {result && <>
      <Table><TableHeader><TableRow><TableHead>SKU / Produk</TableHead><TableHead>Brand · Tipe</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Satuan dasar</TableHead></TableRow></TableHeader>
        <TableBody>
          {!result.rows.length && <TableRow><TableCell colSpan={4}>Belum ada stok yang cocok.</TableCell></TableRow>}
          {result.rows.map((row) => <TableRow key={row.id}>
            <TableCell><div className="flex items-center gap-3"><Thumbnail key={row.image} image={row.image} /><div><p className="font-medium">{row.product}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></div></div></TableCell>
            <TableCell>{row.brand ?? "—"} · {row.type ?? "—"}</TableCell><TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell><TableCell>{row.unit ?? "—"}</TableCell>
          </TableRow>)}
        </TableBody></Table>
      <ServerTablePagination pagination={result.pagination} pending={loading} onPage={changePage} onPageSize={(value) => { setLoading(true); setPageSize(value); setPage(1); }} />
    </>}
  </div>;
}

function WarehouseGroup({ row, filters }: { row: Awaited<ReturnType<typeof stockBalance>>["rows"][number]; filters: Filters }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="overflow-hidden rounded-xl border">
    <button type="button" aria-expanded={expanded} aria-controls={`warehouse-stock-${row.id}`} onClick={() => setExpanded((value) => !value)}
      className="hover:bg-muted/50 flex w-full flex-wrap items-center gap-3 p-4 text-left">
      {expanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
      <WarehouseIcon className="text-muted-foreground size-5" />
      <span className="min-w-32 flex-1"><span className="block font-medium">{row.warehouse}</span><span className="text-muted-foreground block text-xs">{row.skuCount} SKU sesuai filter</span></span>
      <span className="text-right"><span className="block text-lg font-semibold tabular-nums">{stockQuantity(row.quantity)}</span>
        <span className="text-muted-foreground block text-xs">Total qty{row.unitCount === 1 ? ` · ${row.unit ?? "Tanpa satuan"}` : ` · gabungan ${row.unitCount} satuan`}</span></span>
    </button>
    {expanded && <div id={`warehouse-stock-${row.id}`}><WarehouseDetails warehouseId={row.id} filters={filters} /></div>}
  </section>;
}

export function WarehouseBalanceGroups({ balances, filters }: { balances: Awaited<ReturnType<typeof stockBalance>>; filters: Filters }) {
  return <div className="space-y-3">
    {!balances.rows.length && <p className="text-muted-foreground rounded-xl border py-8 text-center text-sm">Belum ada data yang cocok.</p>}
    {balances.rows.map((row) => <WarehouseGroup key={row.id} row={row} filters={filters} />)}
  </div>;
}
