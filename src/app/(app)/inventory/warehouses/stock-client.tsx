"use client";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { parseAsString, useQueryStates } from "nuqs";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import { SortableHead } from "@/components/table-sort";
import { STOCK_PATH, stockQuantity } from "@/lib/stock";
import type { stockBalance, stockHistory, stockOptions } from "./data";

export function StockClient({ options, balances, history }: {
  options: Awaited<ReturnType<typeof stockOptions>>;
  balances: Awaited<ReturnType<typeof stockBalance>> | null;
  history: Awaited<ReturnType<typeof stockHistory>> | null;
}) {
  const router = useRouter();
  const table = useServerTable();
  const [filters, setFilters] = useQueryStates({
    warehouse: parseAsString.withDefault(""), brand: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""), direction: parseAsString.withDefault(""),
  }, { shallow: false, startTransition: table.startTransition });
  const change = (key: keyof typeof filters, value: string) => { table.setPage(1); void setFilters({ [key]: value }); };
  const pagination = (balances ?? history)!.pagination;
  const heads = { sortKey: table.sortKey, sortDir: table.sortDir, onSort: table.toggleSort };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Input aria-label="Cari stok" className="min-w-52 flex-1" placeholder={history ? "Cari transaksi, referensi, gudang" : "Cari SKU, produk, gudang"}
        value={table.q} onChange={(event) => table.setQuery(event.target.value)} />
      <Combobox options={[{ value: "", label: "Semua gudang" }, ...options.warehouses.map((row) => ({ value: String(row.id), label: row.name }))]}
        value={filters.warehouse} onValueChange={(value) => change("warehouse", value)} placeholder="Semua gudang" className="w-44" />
      {balances && <>
        <Combobox options={[{ value: "", label: "Semua brand" }, ...options.brands.map((row) => ({ value: String(row.id), label: row.name }))]}
          value={filters.brand} onValueChange={(value) => change("brand", value)} placeholder="Semua brand" className="w-40" />
        <Combobox options={[{ value: "", label: "Semua tipe" }, ...options.types.map((row) => ({ value: String(row.id), label: row.name }))]}
          value={filters.type} onValueChange={(value) => change("type", value)} placeholder="Semua tipe" className="w-40" />
      </>}
      {history && <Combobox options={[{ value: "", label: "Semua transaksi" }, { value: "in", label: "Stock In" }, { value: "out", label: "Stock Out" }]}
        value={filters.direction} onValueChange={(value) => change("direction", value)} placeholder="Semua transaksi" className="w-40" />}
      <Button render={<Link href={`${STOCK_PATH}/new?type=in`} />} nativeButton={false}><ArrowDownToLineIcon />Stock In</Button>
      <Button variant="outline" render={<Link href={`${STOCK_PATH}/new?type=out`} />} nativeButton={false}><ArrowUpFromLineIcon />Stock Out</Button>
    </div>
    <div className="overflow-hidden rounded-xl border" aria-busy={table.pending}>
      <Table>
        <TableHeader><TableRow>{balances ? <>
          <SortableHead label="Gudang" columnKey="warehouse" {...heads} />
          <SortableHead label="SKU / Produk" columnKey="product" {...heads} />
          <TableHead>Brand · Tipe</TableHead>
          <SortableHead label="Qty" columnKey="quantity" {...heads} className="text-right" />
          <TableHead>Satuan dasar</TableHead>
        </> : <>
          <TableHead>Nomor / Tanggal</TableHead><TableHead>Transaksi</TableHead><TableHead>Asal → Tujuan</TableHead>
          <TableHead>Referensi</TableHead><TableHead>Pengguna</TableHead>
        </>}</TableRow></TableHeader>
        <TableBody>
          {pagination.total === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-8 text-center">Belum ada data yang cocok.</TableCell></TableRow>}
          {balances?.rows.map((row) => <TableRow key={row.id}>
            <TableCell>{row.warehouse}</TableCell>
            <TableCell><p className="font-medium">{row.product}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></TableCell>
            <TableCell>{row.brand ?? "—"} · {row.type ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell><TableCell>{row.unit ?? "—"}</TableCell>
          </TableRow>)}
          {history?.rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={(event) => {
            if ((event.target as HTMLElement).closest("a") || event.ctrlKey || event.metaKey || event.shiftKey ||
              window.getSelection()?.toString()) return;
            router.push(`${STOCK_PATH}/${row.id}`);
          }}>
            <TableCell><Link href={`${STOCK_PATH}/${row.id}`} className="block font-medium underline-offset-4 hover:underline"
              aria-label={`Lihat detail ${row.type === "in" ? "Stock In" : "Stock Out"} ${row.number ?? row.id}`}>
              {row.number ?? `#${row.id}`}
            </Link>
              <p className="text-muted-foreground text-xs">{row.date ?? "—"}</p></TableCell>
            <TableCell>{row.type === "in" ? "Stock In" : "Stock Out"}<p className="text-muted-foreground text-xs">{row.status === "completed" ? "Selesai" : row.status === "draft" ? "Draf" : "Diproses"}</p></TableCell>
            <TableCell>{row.source ?? "Eksternal"} → {row.destination ?? "—"}</TableCell>
            <TableCell>{row.reference ?? "—"}</TableCell><TableCell>{row.actor ?? "—"}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
    <ServerTablePagination pagination={pagination} pending={table.pending} onPage={table.setPage} onPageSize={table.setPageSize} />
  </div>;
}
