"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { ServerTablePagination, useServerTable } from "@/components/server-table-pagination";
import type { StockOption } from "@/lib/stock";
import type { TablePagination } from "@/lib/table-query";
import type { stockOptions } from "./data";

export function SummaryControls({ options, units, selectedUnitId, pagination, children }: {
  options: Awaited<ReturnType<typeof stockOptions>>;
  units: StockOption[];
  selectedUnitId: number | null;
  pagination: TablePagination;
  children: React.ReactNode;
}) {
  const table = useServerTable();
  const [filters, setFilters] = useQueryStates({
    warehouse: parseAsString.withDefault(""), brand: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""), unit: parseAsString.withDefault(""),
  }, { shallow: false, startTransition: table.startTransition });
  const change = (key: keyof typeof filters, value: string) => {
    table.setPage(1);
    void setFilters({ [key]: value });
  };
  const selectors = [
    { key: "warehouse", label: "Gudang", all: "Semua gudang", options: options.warehouses },
    { key: "brand", label: "Brand", all: "Semua brand", options: options.brands },
    { key: "type", label: "Tipe produk", all: "Semua tipe", options: options.types },
  ] as const;

  return <div className="space-y-4" aria-busy={table.pending}>
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_repeat(4,minmax(0,1fr))]">
      <div className="space-y-1.5">
        <Label htmlFor="summary-search">Cari stok</Label>
        <Input id="summary-search" value={table.q} placeholder="Nama produk, SKU, atau gudang"
          onChange={(event) => table.setQuery(event.target.value)} />
      </div>
      {selectors.map((selector) => <div key={selector.key} className="min-w-0 space-y-1.5">
        <Label htmlFor={`summary-${selector.key}`}>{selector.label}</Label>
        <Combobox id={`summary-${selector.key}`} className="block"
          options={[{ value: "", label: selector.all }, ...selector.options.map((row) => ({ value: String(row.id), label: row.name }))]}
          value={filters[selector.key]} onValueChange={(value) => change(selector.key, value)} placeholder={selector.all} />
      </div>)}
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="summary-unit">Satuan dasar</Label>
        <Combobox id="summary-unit" className="block" options={units.map((unit) => ({ value: String(unit.id), label: unit.name }))}
          value={selectedUnitId === null ? "" : String(selectedUnitId)} placeholder="Belum ada satuan"
          disabled={units.length === 0} onValueChange={(value) => change("unit", value)} />
      </div>
    </div>
    {children}
    <ServerTablePagination pagination={pagination} pending={table.pending} onPage={table.setPage} onPageSize={table.setPageSize} />
  </div>;
}
