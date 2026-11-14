"use client";
import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import { formatMoney, ORDER_STATUSES, orderStatusLabel } from "@/lib/order";
import type { orderList } from "@/lib/order-data";

export function OrdersClient({ data, sales, timezone }: { data: Awaited<ReturnType<typeof orderList>>; sales: { id: number; name: string }[]; timezone: string }) {
  const table = useServerTable();
  const [filters, setFilters] = useQueryStates({ status: parseAsString.withDefault(""), sales: parseAsString.withDefault("") }, { shallow: false, startTransition: table.startTransition });
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2"><Input className="min-w-48 flex-1" aria-label="Cari order" placeholder="Cari nomor, outlet, Sales, referensi" value={table.q} onChange={(event) => table.setQuery(event.target.value)} />
      <Combobox className="w-52" value={filters.status} onValueChange={(status) => { table.setPage(1); void setFilters({ status }); }} options={[{ value: "", label: "Semua status" }, ...ORDER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) }))]} />
      <Combobox className="w-48" value={filters.sales} onValueChange={(sales) => { table.setPage(1); void setFilters({ sales }); }} options={[{ value: "", label: "Semua Sales" }, ...sales.map((row) => ({ value: String(row.id), label: row.name }))]} />
      <Button render={<Link href="/orders/new" />} nativeButton={false}>Buat Order / Penawaran</Button>
    </div>
    <div className="overflow-hidden rounded-xl border" aria-busy={table.pending}><Table><TableHeader><TableRow>
      <TableHead>Nomor / Tanggal</TableHead><TableHead>Outlet</TableHead><TableHead>Sales</TableHead><TableHead>Status barang</TableHead><TableHead>Tagihan</TableHead><TableHead className="text-right">Total</TableHead>
    </TableRow></TableHeader><TableBody>
      {!data.rows.length && <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">Belum ada order yang cocok.</TableCell></TableRow>}
      {data.rows.map((row) => <TableRow key={row.id}><TableCell><Link className="font-medium underline underline-offset-4" href={`/orders/${row.id}`}>{row.number ?? `#${row.id}`}</Link><p className="text-muted-foreground text-xs">{row.date ? new Intl.DateTimeFormat("id-ID", { timeZone: timezone, dateStyle: "medium" }).format(new Date(row.date)) : "—"}</p></TableCell>
        <TableCell>{row.customer ?? "—"}</TableCell><TableCell>{row.sales ?? "—"}</TableCell><TableCell>{orderStatusLabel(row.status)}</TableCell><TableCell>{row.paymentStatus === "paid" ? "Lunas" : row.invoice ? Number(row.paid) > 0 ? "Dibayar sebagian" : "Belum lunas" : "Belum ditagihkan"}</TableCell><TableCell className="text-right tabular-nums">{formatMoney(row.total)}</TableCell></TableRow>)}
    </TableBody></Table></div>
    <ServerTablePagination pagination={data.pagination} pending={table.pending} onPage={table.setPage} onPageSize={table.setPageSize} />
  </div>;
}
