"use client";

import { Input } from "@/components/ui/input";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import type { TablePagination } from "@/lib/table-query";

export function StockDetailControls({ pagination, children }: { pagination: TablePagination; children: React.ReactNode }) {
  const table = useServerTable();
  return <div className="space-y-3" aria-busy={table.pending}>
    <Input aria-label="Cari SKU transaksi" placeholder="Cari nama produk atau SKU" className="max-w-sm"
      value={table.q} onChange={(event) => table.setQuery(event.target.value)} />
    {children}
    <ServerTablePagination pagination={pagination} pending={table.pending} onPage={table.setPage} onPageSize={table.setPageSize} />
  </div>;
}
