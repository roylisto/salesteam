"use client";

import dynamic from "next/dynamic";
import { MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

const OutletMap = dynamic(() => import("./outlet-map").then((module) => module.OutletMap), {
  ssr: false,
  loading: () => <p role="status" className="text-muted-foreground py-8 text-sm">Memuat peta…</p>,
});

export type OutletMapFilters = { area: string; warehouse: string; type: string };
type Option = { id: number; name: string };

export function OutletMapControls({ areas, warehouses, types }: {
  areas: Option[];
  warehouses: (Option & { areaOfficeId: number | null })[];
  types: Option[];
}) {
  const [filters, setFilters] = useState<OutletMapFilters>({ area: "", warehouse: "", type: "" });
  const [applied, setApplied] = useState<{ filters: OutletMapFilters; revision: number } | null>(null);
  const areaOptions = useMemo(() => [
    { value: "", label: "Semua area" },
    ...areas.map(({ id, name }) => ({ value: String(id), label: name })),
  ], [areas]);
  const warehouseOptions = useMemo(() => [
    { value: "", label: "Semua gudang" },
    ...warehouses.filter((warehouse) => !filters.area || String(warehouse.areaOfficeId) === filters.area)
      .map(({ id, name }) => ({ value: String(id), label: name })),
  ], [warehouses, filters.area]);
  const typeOptions = useMemo(() => [
    { value: "", label: "Semua tipe" },
    ...types.map(({ id, name }) => ({ value: String(id), label: name })),
  ], [types]);
  const unapplied = applied && (applied.filters.area !== filters.area ||
    applied.filters.warehouse !== filters.warehouse || applied.filters.type !== filters.type);

  return (
    <div className="space-y-3">
      <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="outlet-map-area">Area</Label>
          <Combobox id="outlet-map-area" options={areaOptions} value={filters.area} placeholder="Semua area"
            onValueChange={(area) => setFilters((current) => current.area === area ? current : { ...current, area, warehouse: "" })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="outlet-map-warehouse">Gudang</Label>
          <Combobox id="outlet-map-warehouse" options={warehouseOptions} value={filters.warehouse} placeholder="Semua gudang"
            onValueChange={(warehouse) => setFilters((current) => ({ ...current, warehouse }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="outlet-map-type">Tipe outlet</Label>
          <Combobox id="outlet-map-type" options={typeOptions} value={filters.type} placeholder="Semua tipe"
            onValueChange={(type) => setFilters((current) => ({ ...current, type }))} />
        </div>
        <Button onClick={() => setApplied((current) => ({ filters, revision: (current?.revision ?? 0) + 1 }))}>
          <MapPinIcon />
          Tampilkan Outlet
        </Button>
      </div>
      {unapplied && <p className="text-muted-foreground text-sm">Klik Tampilkan Outlet untuk menerapkan filter baru.</p>}
      {applied ? <OutletMap filters={applied.filters} revision={applied.revision} /> : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          Pilih filter jika diperlukan, lalu klik Tampilkan Outlet untuk membuka peta.
        </p>
      )}
    </div>
  );
}
