"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Building2Icon } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { WarehouseTypeSymbol, WAREHOUSE_ICONS } from "@/components/warehouse-type-symbol";
import { DEFAULT_WAREHOUSE_COLOR, DEFAULT_WAREHOUSE_ICON, type WarehouseIconKey } from "@/lib/warehouse-appearance";
import type { HeadOfficeLocation, WarehouseRow } from "./types";

function hasCoordinates(location: { latitude: number | null; longitude: number | null }): location is { latitude: number; longitude: number } {
  return location.latitude !== null && location.longitude !== null &&
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180;
}

export function WarehousesMap({ warehouses, headOffice }: { warehouses: WarehouseRow[]; headOffice: HeadOfficeLocation }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [pinPortals, setPinPortals] = useState<{ element: HTMLElement; content: ReactNode }[]>([]);
  const located = useMemo(() => warehouses.filter(hasCoordinates), [warehouses]);
  const officeLocated = hasCoordinates(headOffice);
  const legend = useMemo(() => Array.from(new Map(warehouses.map((warehouse) => [
    warehouse.warehouseTypeId,
    { name: warehouse.warehouseTypeName ?? "Tanpa tipe", icon: warehouse.warehouseTypeIcon ?? DEFAULT_WAREHOUSE_ICON, color: warehouse.warehouseTypeColor ?? DEFAULT_WAREHOUSE_COLOR },
  ])).values()), [warehouses]);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    const portals: { element: HTMLElement; content: ReactNode }[] = [];

    async function initialize() {
      try {
        const L = await import("leaflet");
        if (disposed || !containerRef.current) return;
        map = L.map(containerRef.current).setView([-2.5, 118], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        function addPin(latitude: number, longitude: number, name: string, details: string[], color: string, icon: string, office = false, href?: string) {
          const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_WAREHOUSE_COLOR;
          const element = document.createElement("div");
          const Icon = office ? Building2Icon : (WAREHOUSE_ICONS[icon as WarehouseIconKey] ?? WAREHOUSE_ICONS.warehouse).icon;
          portals.push({ element, content: (
            <div style={{ width: 38, height: 38, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", backgroundColor: safeColor, border: "3px solid white", boxShadow: "0 2px 6px #0005", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon aria-hidden="true" style={{ width: 21, height: 21, color: "white", transform: "rotate(45deg)" }} />
            </div>
          ) });
          const popup = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = name;
          popup.append(title);
          details.filter(Boolean).forEach((detail) => {
            const line = document.createElement("p");
            line.textContent = detail;
            line.style.margin = "4px 0";
            popup.append(line);
          });
          if (href) {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = "Lihat gudang";
            popup.append(link);
          }
          L.marker([latitude, longitude], {
            icon: L.divIcon({ html: element, className: "warehouse-map-pin", iconSize: [38, 46], iconAnchor: [19, 46], popupAnchor: [0, -44] }),
            title: name,
            alt: name,
            zIndexOffset: office ? 1000 : 0,
          }).addTo(map!).bindPopup(popup);
          bounds.extend([latitude, longitude]);
        }

        located.forEach((warehouse) => {
          if (!hasCoordinates(warehouse)) return;
          addPin(warehouse.latitude, warehouse.longitude, warehouse.name, [
            warehouse.warehouseTypeName ?? "Tanpa tipe",
            warehouse.areaName ?? "Belum ditugaskan ke area",
            warehouse.isActive ? "Aktif" : "Tidak aktif",
            warehouse.address ?? "",
          ], warehouse.warehouseTypeColor ?? DEFAULT_WAREHOUSE_COLOR, warehouse.warehouseTypeIcon ?? DEFAULT_WAREHOUSE_ICON, false, `/master-data/warehouses/${warehouse.id}`);
        });
        if (hasCoordinates(headOffice)) {
          addPin(headOffice.latitude, headOffice.longitude, `Kantor Pusat (Head Office) — ${headOffice.name}`, [headOffice.address ?? ""], "#0f172a", "", true);
        }
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(containerRef.current);
        setPinPortals(portals);
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("error");
      }
    }
    void initialize();
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [located, headOffice, attempt]);

  return (
    <div className="space-y-3">
      {pinPortals.map(({ element, content }, index) => createPortal(content, element, String(index)))}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>{located.length} dari {warehouses.length} gudang memiliki titik lokasi. Peta mengikuti pencarian dan filter area.</p>
        <Button variant="outline" size="sm" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Tampilkan semua titik</Button>
      </div>
      {warehouses.length > located.length && <p className="text-muted-foreground text-sm">{warehouses.length - located.length} gudang belum memiliki koordinat yang valid. Lengkapi lokasi melalui halaman ubah gudang agar tampil di peta.</p>}
      {!officeLocated && <p className="text-muted-foreground text-sm">Lokasi Kantor Pusat belum diatur. Lengkapi titik lokasi di Pengaturan Organisasi agar tampil di peta.</p>}
      {located.length === 0 && !officeLocated && <p className="text-muted-foreground text-sm">Belum ada titik lokasi untuk ditampilkan.</p>}
      <div className="relative isolate overflow-hidden rounded-xl border">
        <div ref={containerRef} className="h-[60svh] min-h-96 w-full" role="region" aria-label="Peta lokasi gudang dan Kantor Pusat" />
        {status !== "ready" && (
          <div className="bg-background/90 absolute inset-0 z-[1000] flex items-center justify-center p-4 text-center" role="status">
            {status === "loading" ? "Memuat peta…" : <div className="space-y-2"><p>Peta tidak dapat dimuat.</p><Button onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Coba lagi</Button></div>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Legenda peta">
        <span className="flex items-center gap-2 text-sm"><Building2Icon className="size-5 text-slate-900 dark:text-slate-200" />Kantor Pusat (Head Office)</span>
        {legend.map((type) => <span key={`${type.name}-${type.icon}-${type.color}`} className="flex items-center gap-2 text-sm"><WarehouseTypeSymbol icon={type.icon} color={type.color} />{type.name}</span>)}
      </div>
    </div>
  );
}
