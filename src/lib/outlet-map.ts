export const OUTLET_CITY_ZOOM = 7;
export const OUTLET_DISTRICT_ZOOM = 10;
export const OUTLET_VILLAGE_ZOOM = 13;
export const OUTLET_PIN_ZOOM = 15;
export const OUTLET_MAP_MAX_ZOOM = 19;

export type OutletMapRegion = "province" | "city" | "district" | "village";

export const outletRegionLabels: Record<OutletMapRegion, string> = {
  province: "provinsi",
  city: "kabupaten/kota",
  district: "kecamatan",
  village: "kelurahan/desa",
};

export const outletRegionNextZoom: Record<OutletMapRegion, number> = {
  province: OUTLET_CITY_ZOOM,
  city: OUTLET_DISTRICT_ZOOM,
  district: OUTLET_VILLAGE_ZOOM,
  village: OUTLET_PIN_ZOOM,
};

export function outletMapRegion(zoom: number): OutletMapRegion {
  if (zoom < OUTLET_CITY_ZOOM) return "province";
  if (zoom < OUTLET_DISTRICT_ZOOM) return "city";
  if (zoom < OUTLET_VILLAGE_ZOOM) return "district";
  return "village";
}

export type OutletMapGroup = {
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
};

export type OutletMapPin = {
  id: number;
  name: string | null;
  typeName: string | null;
  icon: string | null;
  color: string | null;
  latitude: number;
  longitude: number;
};

export type OutletMapResult =
  | { mode: OutletMapRegion; groups: OutletMapGroup[]; dense: boolean }
  | { mode: "pins"; pins: OutletMapPin[] }
  | { mode: "overflow" };
