"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ImageOverlay, LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { OUTLET_ICONS } from "@/components/outlet-type-symbol";
import { Button } from "@/components/ui/button";
import { DEFAULT_OUTLET_COLOR, DEFAULT_OUTLET_ICON, OUTLET_ICON_KEYS } from "@/lib/outlet-appearance";
import { BIG_BOUNDARY_SOURCE, outletBoundaryImageUrl } from "@/lib/outlet-boundaries";
import {
  OUTLET_MAP_MAX_ZOOM, outletMapRegion, outletRegionLabels, outletRegionNextZoom,
  type OutletMapGroup, type OutletMapPin, type OutletMapRegion, type OutletMapResult,
} from "@/lib/outlet-map";

import type { OutletMapFilters } from "./outlet-map-controls";

type Engine = { L: typeof import("leaflet"); map: LeafletMap };
const number = new Intl.NumberFormat("id-ID");
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [[-11.5, 94.5], [6.5, 141.5]];
const regionColors: Record<OutletMapRegion, string> = {
  province: "#312e81",
  city: "#4338ca",
  district: "#3730a3",
  village: "#0369a1",
};

function regionName(group: OutletMapGroup, mode: OutletMapRegion) {
  return group[mode] ?? `${outletRegionLabels[mode][0].toUpperCase()}${outletRegionLabels[mode].slice(1)} belum diisi`;
}

function BoundaryLayer({ engine }: { engine: Engine }) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const { L, map } = engine;
    let current: ImageOverlay | undefined;
    let pending: ImageOverlay | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout>;
    let level: OutletMapRegion | undefined;
    let lastUrl = "";
    let pendingUrl = "";

    function cancelPending() {
      clearTimeout(timeout);
      pending?.remove();
      pending = undefined;
      pendingUrl = "";
    }

    function refresh() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const region = outletMapRegion(map.getZoom());
        if (level !== region) {
          current?.remove();
          current = undefined;
        }
        level = region;
        const bounds = region === "province" ? L.latLngBounds(INDONESIA_BOUNDS) : map.getBounds();
        const sw = L.CRS.EPSG3857.project(bounds.getSouthWest());
        const ne = L.CRS.EPSG3857.project(bounds.getNorthEast());
        const size = map.getSize();
        if (!size.x || !size.y) return;
        const scale = Math.min(1, 1536 / Math.max(size.x, size.y));
        const imageSize: [number, number] = region === "province"
          ? [1024, Math.round(1024 * (ne.y - sw.y) / (ne.x - sw.x))]
          : [Math.max(1, Math.round(size.x * scale)), Math.max(1, Math.round(size.y * scale))];
        const url = outletBoundaryImageUrl(region, [sw.x, sw.y, ne.x, ne.y], imageSize);
        if (url === pendingUrl || (current && url === lastUrl)) return;
        cancelPending();

        const overlay = L.imageOverlay(url, bounds, { interactive: false, attribution: "Batas wilayah © BIG" });
        pending = overlay;
        pendingUrl = url;
        function fail() {
          if (pending !== overlay) return;
          cancelPending();
          setUnavailable(true);
        }
        function finish() {
          if (pending !== overlay) return;
          clearTimeout(timeout);
          current?.remove();
          current = overlay;
          pending = undefined;
          pendingUrl = "";
          lastUrl = url;
          setUnavailable(false);
        }
        overlay.once("load", finish);
        overlay.once("error", fail);
        overlay.once("remove", () => {
          // Keep Leaflet's own remove listener so it can detach map events.
          overlay.off("load", finish).off("error", fail);
        });
        timeout = setTimeout(fail, 30_000);
        overlay.addTo(map);
      }, 220);
    }

    map.on("moveend resize", refresh);
    refresh();
    return () => {
      clearTimeout(timer);
      cancelPending();
      current?.remove();
      map.off("moveend resize", refresh);
    };
  }, [engine]);

  return unavailable ? (
    <p role="status" className="bg-background/95 absolute top-2 right-2 z-[850] max-w-64 rounded-md px-2 py-1 text-xs shadow">
      Garis batas BIG belum tersedia. Hitungan outlet tetap dapat dilihat.
    </p>
  ) : null;
}

function OutletPin({ engine, pin }: { engine: Engine; pin: OutletMapPin }) {
  const [element] = useState(() => document.createElement("div"));
  const name = pin.name ?? "Outlet tanpa nama";
  const iconKey = OUTLET_ICON_KEYS.find((key) => key === pin.icon) ?? DEFAULT_OUTLET_ICON;
  const Icon = OUTLET_ICONS[iconKey].icon;
  const color = pin.color && /^#[a-f0-9]{6}$/i.test(pin.color) ? pin.color : DEFAULT_OUTLET_COLOR;
  const foreground = parseInt(color.slice(1, 3), 16) * 0.299 +
    parseInt(color.slice(3, 5), 16) * 0.587 + parseInt(color.slice(5, 7), 16) * 0.114 > 160 ? "#0f172a" : "#ffffff";

  useEffect(() => {
    const { L, map } = engine;
    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = name;
    const type = document.createElement("div");
    type.textContent = pin.typeName ?? "Tanpa tipe outlet";
    const link = document.createElement("a");
    link.href = `/master-data/outlets/${pin.id}`;
    link.textContent = "Lihat outlet";
    popup.append(title, type, link);
    const marker = L.marker([pin.latitude, pin.longitude], {
      title: name,
      alt: name,
      icon: L.divIcon({ html: element, className: "outlet-map-pin", iconSize: [32, 38], iconAnchor: [16, 38], popupAnchor: [0, -36] }),
    }).addTo(map).bindPopup(popup);
    return () => { marker.remove(); };
  }, [element, engine, name, pin]);

  return createPortal(
    <span className="flex size-8 -rotate-45 items-center justify-center rounded-t-full rounded-br-full border-2 border-white shadow-md" style={{ backgroundColor: color, color: foreground }}>
      <Icon className="size-[18px] rotate-45" aria-hidden="true" />
    </span>, element,
  );
}

function GroupLayer({ engine, groups, mode }: {
  engine: Engine;
  groups: OutletMapGroup[];
  mode: OutletMapRegion;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { L, map } = engine;
    const sorted = [...groups].sort((a, b) => a.count - b.count);
    let hitAreas: { x: number; y: number; radius: number; group: OutletMapGroup }[] = [];
    let hovered: OutletMapGroup | undefined;
    const tooltip = L.tooltip({ direction: "top", offset: [0, -12] });

    function draw() {
      if (!canvas || !context) return;
      const size = map.getSize();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size.x * ratio);
      canvas.height = Math.round(size.y * ratio);
      context.scale(ratio, ratio);
      context.font = "600 12px system-ui";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 2;
      context.strokeStyle = "#ffffff";
      hitAreas = [];
      for (const group of sorted) {
        if (group.latitude === null || group.longitude === null || (mode === "province" && !group.province)) continue;
        const point = map.latLngToContainerPoint([group.latitude, group.longitude]);
        if (point.x < 0 || point.y < 0 || point.x > size.x || point.y > size.y) continue;
        const label = number.format(group.count);
        const radius = Math.max(13, context.measureText(label).width / 2 + 5);
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = regionColors[mode];
        context.fill();
        context.stroke();
        context.fillStyle = "#ffffff";
        context.fillText(label, point.x, point.y);
        hitAreas.push({ x: point.x, y: point.y, radius, group });
      }
      canvas.style.visibility = "visible";
    }

    function hit(event: LeafletMouseEvent) {
      const { x, y } = event.containerPoint;
      return hitAreas.findLast((area) => (x - area.x) ** 2 + (y - area.y) ** 2 <= area.radius ** 2)?.group;
    }

    function clearTooltip() {
      hovered = undefined;
      tooltip.remove();
    }

    function handleHover(event: LeafletMouseEvent) {
      const group = hit(event);
      if (group === hovered) return;
      clearTooltip();
      if (!group || group.latitude === null || group.longitude === null) return;
      hovered = group;
      const levels = ["village", "district", "city", "province"] as const;
      const location = [regionName(group, mode), ...levels.slice(levels.indexOf(mode) + 1).map((level) => group[level])].filter(Boolean);
      const content = document.createElement("span");
      content.textContent = `${location.join(", ")} · ${number.format(group.count)} outlet`;
      tooltip.setLatLng([group.latitude, group.longitude]).setContent(content).addTo(map);
    }

    function handleClick(event: LeafletMouseEvent) {
      const group = hit(event);
      if (!group || group.latitude === null || group.longitude === null) return;
      const nextLevel = outletRegionNextZoom[mode];
      const zoom = Math.min(OUTLET_MAP_MAX_ZOOM, Math.max(nextLevel, map.getZoom() + 1));
      map.setView([group.latitude, group.longitude], zoom);
    }

    function hide() {
      if (canvas) canvas.style.visibility = "hidden";
      hitAreas = [];
      clearTooltip();
    }

    map.on("moveend resize", draw);
    map.on("movestart", hide);
    map.on("mousemove", handleHover);
    map.on("mouseout", clearTooltip);
    map.on("click", handleClick);
    draw();
    return () => {
      map.off("moveend resize", draw);
      map.off("movestart", hide);
      map.off("mousemove", handleHover);
      map.off("mouseout", clearTooltip);
      map.off("click", handleClick);
      clearTooltip();
    };
  }, [engine, groups, mode]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[450] size-full" />;
}

export function OutletMap({ filters, revision }: { filters: OutletMapFilters; revision: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [result, setResult] = useState<OutletMapResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapAttempt, setMapAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      const container = containerRef.current;
      if (disposed || !container) return;
      const world = L.latLngBounds([-85, -180], [85, 180]);
      map = L.map(container, { minZoom: 3, maxBounds: world, maxBoundsViscosity: 1 });
      map.fitBounds(INDONESIA_BOUNDS, { maxZoom: 5 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: OUTLET_MAP_MAX_ZOOM,
        noWrap: true,
      }).addTo(map);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container);
      setEngine({ L, map });
    }).catch(() => { if (!disposed) setStatus("error"); });
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [mapAttempt]);

  useEffect(() => {
    if (!engine) return;
    const { map } = engine;
    let request: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let lastQuery: string | undefined;

    function refresh() {
      request?.abort();
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const controller = new AbortController();
        request = controller;
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const national = outletMapRegion(zoom) === "province";
        const query = new URLSearchParams({
          south: national ? "-90" : String(Math.max(-90, bounds.getSouth())),
          north: national ? "90" : String(Math.min(90, bounds.getNorth())),
          west: national ? "-180" : String(Math.max(-180, bounds.getWest())),
          east: national ? "180" : String(Math.min(180, bounds.getEast())),
          zoom: national ? "0" : String(zoom),
        });
        for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
        const key = query.toString();
        if (lastQuery === key) return;
        lastQuery = undefined;
        setResult(null);
        setStatus("loading");
        try {
          const response = await fetch(`/api/outlets/map?${query}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Map request failed");
          const data: OutletMapResult = await response.json();
          if (!controller.signal.aborted) {
            lastQuery = key;
            setResult(data);
            setStatus("ready");
          }
        } catch {
          if (!controller.signal.aborted) setStatus("error");
        }
      }, 160);
    }

    map.on("moveend resize", refresh);
    refresh();
    return () => {
      clearTimeout(timer);
      request?.abort();
      map.off("moveend resize", refresh);
    };
  }, [engine, filters, revision]);

  const total = !result || result.mode === "overflow" ? 0 : result.mode === "pins"
    ? result.pins.length : result.groups.reduce((sum, group) => sum + group.count, 0);
  const level = result && "groups" in result ? `per ${outletRegionLabels[result.mode]}` : "sebagai pin";
  return (
    <div className="space-y-2">
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {status === "loading" ? "Memuat outlet…" : status === "error" ?
          engine ? "Data outlet gagal dimuat. Klik Tampilkan Outlet untuk mencoba lagi." : "Peta gagal dimuat." :
          result?.mode === "overflow" ? "Terlalu banyak wilayah dalam tampilan ini. Perbesar peta atau pilih filter yang lebih spesifik." :
          total === 0 ? "Tidak ada outlet berkoordinat yang cocok di tampilan ini." :
          `${number.format(total)} outlet ${level}${result?.mode === "province" ? " sesuai filter" : " dalam tampilan peta"}.`}
        {result && "dense" in result && result.dense && " Perbesar lagi atau gunakan filter untuk melihat pin di area padat."}
      </p>
      {!engine && status === "error" && <Button size="sm" variant="outline" onClick={() => {
        setStatus("loading");
        setMapAttempt((attempt) => attempt + 1);
      }}>Coba muat peta lagi</Button>}
      <div className="relative isolate overflow-hidden rounded-xl border">
        <div ref={containerRef} className="h-[65svh] min-h-96 w-full" role="region" aria-label="Peta lokasi outlet" />
        {engine && <BoundaryLayer engine={engine} />}
        {engine && result?.mode === "pins" && result.pins.map((pin) => <OutletPin key={pin.id} engine={engine} pin={pin} />)}
        {engine && result && "groups" in result && (
          <GroupLayer engine={engine} groups={result.groups} mode={result.mode} />
        )}
      </div>
      {result?.mode === "province" && result.groups.length > 0 && (
        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Jumlah outlet per provinsi</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...result.groups].sort((a, b) => b.count - a.count).map((group) => (
              <li key={group.province ?? "missing"} className="flex justify-between gap-2 border-b py-1">
                <span>{regionName(group, "province")}</span><span className="font-medium tabular-nums">{number.format(group.count)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-muted-foreground text-xs">
        Klik angka untuk memperbesar wilayah. Klik pin untuk melihat detail outlet. Batas wilayah dari{" "}
        <a href={BIG_BOUNDARY_SOURCE} target="_blank" rel="noreferrer" className="underline">Badan Informasi Geospasial</a>.
      </p>
    </div>
  );
}
