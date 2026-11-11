"use client";

import dynamic from "next/dynamic";
import { MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useWilayahCascade } from "@/components/use-wilayah-cascade";

const OutletMap = dynamic(() => import("./outlet-map").then((module) => module.OutletMap), {
  ssr: false,
  loading: () => <p role="status" className="text-muted-foreground py-8 text-sm">Memuat peta…</p>,
});

export type OutletMapFilters = {
  province: string;
  city: string;
  district: string;
  village: string;
  type: string;
};
type Option = { id: number; name: string };

export function OutletMapControls({ types }: {
  types: Option[];
}) {
  const [type, setType] = useState("");
  const {
    province, regency, district, village,
    provinces, regencies, districts, villages,
    loadingProvince, loadingRegency, loadingDistrict, loadingVillage,
    setProvince, setRegency, setDistrict, setVillage,
  } = useWilayahCascade();
  const [applied, setApplied] = useState<{ filters: OutletMapFilters; revision: number } | null>(null);
  const filters: OutletMapFilters = { province, city: regency, district, village, type };
  const regionFields = [
    { key: "province", label: "Provinsi", value: province, options: provinces, change: setProvince, loading: loadingProvince, enabled: true },
    { key: "city", label: "Kabupaten/Kota", value: regency, options: regencies, change: setRegency, loading: loadingRegency, enabled: Boolean(province) },
    { key: "district", label: "Kecamatan", value: district, options: districts, change: setDistrict, loading: loadingDistrict, enabled: Boolean(regency) },
    { key: "village", label: "Kelurahan/Desa", value: village, options: villages, change: setVillage, loading: loadingVillage, enabled: Boolean(district) },
  ];
  const typeOptions = useMemo(() => [
    { value: "", label: "Semua tipe" },
    ...types.map(({ id, name }) => ({ value: String(id), label: name })),
  ], [types]);
  const unapplied = applied && (Object.keys(filters) as (keyof OutletMapFilters)[])
    .some((key) => applied.filters[key] !== filters[key]);

  return (
    <div className="space-y-3">
      <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {regionFields.map((field) => {
          const id = `outlet-map-${field.key}`;
          return (
            <div className="min-w-0 space-y-1.5" key={field.key}>
              <Label htmlFor={id}>{field.label}</Label>
              <Combobox
                id={id}
                options={field.options.map(({ nama }) => ({ value: nama, label: nama }))}
                value={field.value}
                placeholder={field.loading ? "Memuat…" : `Semua ${field.label.toLowerCase()}`}
                disabled={!field.enabled || field.loading}
                onValueChange={(value) => { if (value !== field.value) field.change(value); }}
              />
            </div>
          );
        })}
        <div className="space-y-1.5">
          <Label htmlFor="outlet-map-type">Tipe outlet</Label>
          <Combobox id="outlet-map-type" options={typeOptions} value={type} placeholder="Semua tipe"
            onValueChange={setType} />
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
