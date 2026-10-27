"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, LocateFixedIcon, SearchIcon } from "lucide-react";

import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_CENTER: [number, number] = [-6.2, 106.816666];

/**
 * OpenStreetMap (Leaflet) picker. Leaflet is imported lazily inside an effect,
 * so nothing touches `window` during SSR. Coordinates are reported as strings
 * via `onChange` and fed back into the hidden form fields.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const focusRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const hasCoords = latitude.trim() !== "" && longitude.trim() !== "";
      const startLat = hasCoords ? Number(latitude) : DEFAULT_CENTER[0];
      const startLng = hasCoords ? Number(longitude) : DEFAULT_CENTER[1];

      const map = L.map(containerRef.current).setView(
        [startLat, startLng],
        hasCoords ? 16 : 11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // A divIcon avoids Leaflet's bundler-broken default marker images.
      const icon = L.divIcon({
        className: "",
        html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.45)"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      function place(lat: number, lng: number, recenter: boolean) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          marker.on("dragend", () => {
            const position = marker.getLatLng();
            onChangeRef.current(
              position.lat.toFixed(7),
              position.lng.toFixed(7),
            );
          });
          markerRef.current = marker;
        }
        if (recenter) map.setView([lat, lng], Math.max(map.getZoom(), 16));
      }

      focusRef.current = (lat, lng) => {
        place(lat, lng, true);
        onChangeRef.current(lat.toFixed(7), lng.toFixed(7));
      };

      if (hasCoords) place(startLat, startLng, false);

      map.on("click", (event: LeafletMouseEvent) => {
        place(event.latlng.lat, event.latlng.lng, false);
        onChangeRef.current(
          event.latlng.lat.toFixed(7),
          event.latlng.lng.toFixed(7),
        );
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      focusRef.current = null;
    };
    // Map is initialised once; later coordinate changes flow through the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    const value = query.trim();
    if (!value) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(value)}`,
      );
      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (results.length === 0) {
        setMessage("No location found for that search.");
        return;
      }
      focusRef.current?.(Number(results[0].lat), Number(results[0].lon));
    } catch {
      setMessage("Search failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        focusRef.current?.(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      () => setMessage("Unable to read your current location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Search an address or place"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSearch()}
          disabled={busy}
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
          Search
        </Button>
        <Button type="button" variant="outline" onClick={handleLocate}>
          <LocateFixedIcon />
          My location
        </Button>
      </div>

      <div
        ref={containerRef}
        className="z-0 h-64 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10"
      />

      <p className="text-muted-foreground text-xs">
        Click the map or drag the marker to set the point.
        {message ? <span className="text-destructive"> {message}</span> : null}
      </p>
    </div>
  );
}
