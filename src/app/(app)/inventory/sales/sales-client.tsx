"use client";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { parseAsString, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import { SALES_STOCK_PATH, stockQuantity, stockStatusLabel } from "@/lib/stock";
import type { salesBalance, salesHistory, salesOptions } from "./data";

export function SalesClient({ options, balances, history, canTransact }: {
  options: Awaited<ReturnType<typeof salesOptions>>;
  balances: Awaited<ReturnType<typeof salesBalance>> | null;
  history: Awaited<ReturnType<typeof salesHistory>> | null;
  canTransact: boolean;
}) {
  const table = useServerTable();
  const router = useRouter();
  const [filters, setFilters] = useQueryStates({ sales: parseAsString.withDefault(""), warehouse: parseAsString.withDefault(""),
    direction: parseAsString.withDefault("") }, { shallow: false, startTransition: table.startTransition });
  const change = (key: keyof typeof filters, value: string) => { table.setPage(1); void setFilters({ [key]: value }); };
  const pagination = (balances ?? history)!.pagination;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Input className="min-w-52 flex-1" aria-label="Cari Stok Sales" value={table.q}
        placeholder={history ? "Cari transaksi, Sales, gudang, referensi" : "Cari Sales, SKU, produk, gudang"}
        onChange={(event) => table.setQuery(event.target.value)} />
      <Combobox value={filters.sales} onValueChange={(value) => change("sales", value)} placeholder="Semua Sales" className="w-44"
        options={[{ value: "", label: "Semua Sales" }, ...options.sales.map((row) => ({ value: String(row.id), label: row.name }))]} />
      <Combobox value={filters.warehouse} onValueChange={(value) => change("warehouse", value)} placeholder="Semua gudang asal" className="w-44"
        options={[{ value: "", label: "Semua gudang asal" }, ...options.warehouses.map((row) => ({ value: String(row.id), label: row.name }))]} />
      {history && <Combobox value={filters.direction} onValueChange={(value) => change("direction", value)} placeholder="Semua transaksi" className="w-44"
        options={[{ value: "", label: "Semua transaksi" }, { value: "in", label: "Pengambilan" }, { value: "out", label: "Pengembalian" }]} />}
      {canTransact && <>
        <Button render={<Link href={`${SALES_STOCK_PATH}/new?type=in`} />} nativeButton={false}>Ambil Stok</Button>
        <Button variant="outline" render={<Link href={`${SALES_STOCK_PATH}/new?type=out`} />} nativeButton={false}>Kembalikan Stok</Button>
      </>}
    </div>
    <div className="overflow-hidden rounded-xl border" aria-busy={table.pending}>
      <Table><TableHeader><TableRow>
        {balances ? <><TableHead>Sales</TableHead><TableHead>SKU / Produk</TableHead><TableHead>Gudang asal</TableHead>
          <TableHead className="text-right">Qty</TableHead><TableHead>Satuan dasar</TableHead></> :
          <><TableHead>Nomor / Tanggal</TableHead><TableHead>Transaksi</TableHead><TableHead>Sales</TableHead><TableHead>Gudang asal</TableHead><TableHead>Referensi</TableHead></>}
      </TableRow></TableHeader><TableBody>
        {pagination.total === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-8 text-center">Belum ada data yang cocok.</TableCell></TableRow>}
        {balances?.rows.map((row) => <TableRow key={row.id}><TableCell>{row.sales}</TableCell>
          <TableCell><p className="font-medium">{row.product}</p><p className="text-muted-foreground text-xs">{row.code ?? "—"}</p></TableCell>
          <TableCell>{row.warehouse ?? "Asal belum tercatat"}</TableCell><TableCell className="text-right tabular-nums">{stockQuantity(row.quantity)}</TableCell>
          <TableCell>{row.unit ?? "—"}</TableCell></TableRow>)}
        {history?.rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a") || event.metaKey || event.ctrlKey || window.getSelection()?.toString()) return;
          router.push(`${SALES_STOCK_PATH}/${row.id}`);
        }}>
          <TableCell><Link className="font-medium hover:underline" href={`${SALES_STOCK_PATH}/${row.id}`}>{row.number}</Link>
            <p className="text-muted-foreground text-xs">{row.date}</p></TableCell>
          <TableCell>{row.type === "in" ? "Pengambilan" : "Pengembalian"}<p className="text-muted-foreground text-xs">{stockStatusLabel(row.status)}</p></TableCell>
          <TableCell>{row.sales ?? "—"}</TableCell><TableCell>{row.warehouse ?? "—"}</TableCell><TableCell>{row.reference ?? "—"}</TableCell>
        </TableRow>)}
      </TableBody></Table>
    </div>
    <ServerTablePagination pagination={pagination} pending={table.pending} onPage={table.setPage} onPageSize={table.setPageSize} />
  </div>;
}
