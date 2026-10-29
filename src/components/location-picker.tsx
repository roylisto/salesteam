"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2Icon, LocateFixedIcon, SearchIcon } from "lucide-react";

import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_CENTER: [number, number] = [-6.2, 106.816666];

export interface AddressComponents {
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export interface LocationPickerProps {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  onAddressChange?: (address: AddressComponents) => void;
  /** Default province options for select (from wilayah.id API) */
  provinceOptions?: Array<{ code: number | string; name: string }>;
  /** Default regency options */
  regencyOptions?: Array<{ code: number | string; name: string }>;
  /** Default district options */
  districtOptions?: Array<{ code: number | string; name: string }>;
  /** Default village options */
  villageOptions?: Array<{ code: number | string; name: string }>;
  /** Loading states for selects */
  loadingProvince?: boolean;
  loadingRegency?: boolean;
  loadingDistrict?: boolean;
  loadingVillage?: boolean;
  /** External state setters for cascading selects (warehouse form style) */
  province?: string;
  setProvince?: (value: string) => void;
  regency?: string;
  setRegency?: (value: string) => void;
  district?: string;
  setDistrict?: (value: string) => void;
  village?: string;
  setVillage?: (value: string) => void;
  postalCode?: string;
  setPostalCode?: (value: string) => void;
  /** Use compact 2-column layout with square map */
  compact?: boolean;
}

async function reverseGeocode(lat: number, lng: number): Promise<AddressComponents | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "id,en;q=0.9",
        },
      },
    );
    const data = await response.json();
    if (!data?.address) return null;

    const addr = data.address;

    // Helper to find the first non-empty value in a list of keys
    const pick = (keys: string[]) => {
      for (const key of keys) {
        const val = addr[key];
        if (val && typeof val === "string") {
          // Ignore purely numeric values for names (often house numbers or noise)
          if (/^\d+$/.test(val.trim())) continue;
          return val;
        }
      }
      return "";
    };

    let province = pick(["state", "province", "region"]);
    let regency = pick(["city", "city_district", "county", "regency"]);
    
    // Special handling for Jakarta: Nominatim often puts "DKI Jakarta" in 'city'
    // and specific areas like "Jakarta Pusat" in 'city_district' or 'suburb'.
    if (regency.toUpperCase().includes("JAKARTA") && province === "") {
      // If regency contains Jakarta and province is empty, shift it up
      province = regency;
      // Try to find a more specific area for regency
      regency = pick(["city_district", "county", "town"]);
      if (regency === province) regency = "";
    }

    // In Indonesia, city_district often contains the Kecamatan
    // But if city is empty and city_district is present, city_district might be the Regency
    const districtKeys = ["subdistrict", "district", "town"];
    if (regency !== addr.city_district && province !== addr.city_district) {
      districtKeys.push("city_district");
    }
    let district = pick(districtKeys);

    const villageKeys = ["village", "hamlet", "neighbourhood", "suburb", "quarter"];
    let village = pick(villageKeys);

    // If district or village is still empty, and we have a city_district that wasn't used
    if (district === "" && addr.city_district && addr.city_district !== regency && addr.city_district !== province) {
      district = addr.city_district;
    }

    // Fallback parsing from display_name if needed
    if (district === "" || village === "") {
      const parts = data.display_name.split(",").map((p: string) => p.trim());
      // Indonesia specific: usually the last 3 parts are Country, Postcode, Province
      // So we look at parts from the end
      if (parts.length >= 5) {
        const countryIdx = parts.length - 1;
        const provinceIdx = parts.length - 3;
        const regencyIdx = parts.length - 4;
        const districtIdx = parts.length - 5;
        const villageIdx = parts.length - 6;

        if (district === "" && districtIdx >= 0) district = parts[districtIdx];
        if (village === "" && villageIdx >= 0) village = parts[villageIdx];
      }
    }

    // Final check: if they are the same, try to differentiate
    if (district === village && village !== "") {
      village = pick(["village", "hamlet", "neighbourhood"]);
    }

    return {
      province: province.toUpperCase(),
      regency: regency.toUpperCase(),
      district: district.toUpperCase(),
      village: village.toUpperCase(),
      postalCode: addr.postcode || "",
      address: data.display_name || "",
      latitude: lat.toFixed(7),
      longitude: lng.toFixed(7),
    };
  } catch {
    return null;
  }
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressChange,
  provinceOptions = [],
  regencyOptions = [],
  districtOptions = [],
  villageOptions = [],
  loadingProvince = false,
  loadingRegency = false,
  loadingDistrict = false,
  loadingVillage = false,
  province: extProvince,
  setProvince: setExtProvince,
  regency: extRegency,
  setRegency: setExtRegency,
  district: extDistrict,
  setDistrict: setExtDistrict,
  village: extVillage,
  setVillage: setExtVillage,
  postalCode: extPostalCode,
  setPostalCode: setExtPostalCode,
  compact = false,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const focusRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressChangeRef = useRef(onAddressChange);
  const syncAddressRef = useRef<(lat: number, lng: number) => Promise<void>>(
    async () => {},
  );
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressChangeRef.current = onAddressChange;
  }, [onChange, onAddressChange]);

  // Reverse geocode a point and push the address components to the form.
  useEffect(() => {
    syncAddressRef.current = async (lat: number, lng: number) => {
      const addressData = await reverseGeocode(lat, lng);
      if (!addressData) return;

      onAddressChangeRef.current?.(addressData);

      // Also call external setters if provided (for cascading selects)
      if (addressData.province && setExtProvince) {
        setExtProvince(addressData.province);
      }
      if (addressData.regency && setExtRegency) {
        setExtRegency(addressData.regency);
      }
      if (addressData.district && setExtDistrict) {
        setExtDistrict(addressData.district);
      }
      if (addressData.village && setExtVillage) {
        setExtVillage(addressData.village);
      }
      if (addressData.postalCode && setExtPostalCode) {
        setExtPostalCode(addressData.postalCode);
      }
    };
  }, [
    setExtProvince,
    setExtRegency,
    setExtDistrict,
    setExtVillage,
    setExtPostalCode,
  ]);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
            void syncAddressRef.current(position.lat, position.lng);
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

      map.on("click", async (event: LeafletMouseEvent) => {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        place(lat, lng, false);
        onChangeRef.current(lat.toFixed(7), lng.toFixed(7));

        // Reverse geocode to get address components
        await syncAddressRef.current(lat, lng);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      focusRef.current = null;
    };
  }, [latitude, longitude]);

  const handleSearch = useCallback(async () => {
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
        setMessage("Lokasi tidak ditemukan untuk pencarian itu.");
        return;
      }
      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      focusRef.current?.(lat, lng);
      onChangeRef.current(lat.toFixed(7), lng.toFixed(7));

      // Also reverse geocode the search result
      await syncAddressRef.current(lat, lng);
    } catch {
      setMessage("Pencarian gagal. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [query]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("Geolokasi tidak didukung oleh peramban ini.");
      return;
    }
    setMessage(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        focusRef.current?.(lat, lng);
        try {
          await syncAddressRef.current(lat, lng);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setMessage("Tidak dapat membaca lokasi Anda saat ini.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const showAddressFields =
    (extProvince !== undefined && setExtProvince) ||
    (extRegency !== undefined && setExtRegency) ||
    (extDistrict !== undefined && setExtDistrict) ||
    (extVillage !== undefined && setExtVillage) ||
    (extPostalCode !== undefined && setExtPostalCode);

  // Compact 2-column layout
  if (compact) {
    return (
      <div
        className={showAddressFields ? "grid gap-2" : "space-y-2"}
        style={showAddressFields ? { gridTemplateColumns: "1fr 1fr" } : undefined}
      >
        {/* Left: Square Map / Main Section */}
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
                placeholder="Cari alamat atau tempat"
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
              Cari
            </Button>
            <Button type="button" variant="outline" onClick={handleLocate} disabled={busy}>
              <LocateFixedIcon />
              Lokasi saya
            </Button>
          </div>

          <div
            ref={containerRef}
            className="z-0 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10 bg-muted"
            style={{ aspectRatio: "16 / 9", maxHeight: "320px" }}
          >
            {!mapReady && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2Icon className="animate-spin size-6" />
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Klik peta atau seret penanda untuk menetapkan titik. Alamat akan terisi otomatis.
            {message ? <span className="text-destructive"> {message}</span> : null}
          </p>
        </div>

        {/* Right: Address Fields (only if provided) */}
        {showAddressFields && (
          <div className="space-y-3 overflow-y-auto max-h-[500px] p-2">
            {extProvince !== undefined && setExtProvince && (
              <div className="space-y-1.5">
                <Label>Provinsi</Label>
                <Select
                  value={extProvince}
                  onValueChange={(value) => setExtProvince?.(value ?? "")}
                  disabled={loadingProvince}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingProvince ? "Memuat..." : "Pilih provinsi"}>
                      {extProvince}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {provinceOptions.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {extRegency !== undefined && setExtRegency && (
              <div className="space-y-1.5">
                <Label>Kabupaten/Kota</Label>
                <Select
                  value={extRegency}
                  onValueChange={(value) => {
                    setExtRegency?.(value ?? "");
                    setExtDistrict?.("");
                    setExtVillage?.("");
                  }}
                  disabled={!extProvince || loadingRegency}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingRegency ? "Memuat..." : "Pilih kabupaten/kota"}>
                      {extRegency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {regencyOptions.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {extDistrict !== undefined && setExtDistrict && (
              <div className="space-y-1.5">
                <Label>Kecamatan</Label>
                <Select
                  value={extDistrict}
                  onValueChange={(value) => {
                    setExtDistrict?.(value ?? "");
                    setExtVillage?.("");
                  }}
                  disabled={!extRegency || loadingDistrict}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingDistrict ? "Memuat..." : "Pilih kecamatan"}>
                      {extDistrict}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {districtOptions.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {extVillage !== undefined && setExtVillage && (
              <div className="space-y-1.5">
                <Label>Kelurahan/Desa</Label>
                <Select
                  value={extVillage}
                  onValueChange={(value) => setExtVillage?.(value ?? "")}
                  disabled={!extDistrict || loadingVillage}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingVillage ? "Memuat..." : "Pilih kelurahan/desa"}>
                      {extVillage}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {villageOptions.map((item) => (
                      <SelectItem key={String(item.code)} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {extPostalCode !== undefined && setExtPostalCode && (
              <div className="space-y-1.5">
                <Label htmlFor="loc-postal">Kode pos</Label>
                <Input
                  id="loc-postal"
                  value={extPostalCode}
                  onChange={(event) => setExtPostalCode?.(event.target.value)}
                  placeholder="12345"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Original single-column layout (for backward compatibility)
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
            placeholder="Cari alamat atau tempat"
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
          Cari
        </Button>
        <Button type="button" variant="outline" onClick={handleLocate} disabled={busy}>
          <LocateFixedIcon />
          Lokasi saya
        </Button>
      </div>

      <div
        ref={containerRef}
        className="z-0 h-64 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10"
      >
        {!mapReady && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2Icon className="animate-spin size-6" />
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Klik peta atau seret penanda untuk menetapkan titik.
        {message ? <span className="text-destructive"> {message}</span> : null}
      </p>
    </div>
  );
}