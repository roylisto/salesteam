export const WAREHOUSE_ICON_KEYS = [
  "warehouse",
  "boxes",
  "package",
  "container",
  "forklift",
  "truck",
  "package-open",
  "package-check",
  "package-plus",
  "package-minus",
  "archive",
  "factory",
  "snowflake",
  "scale",
  "clipboard-list",
  "barcode",
  "ship",
  "plane",
] as const;
export type WarehouseIconKey = (typeof WAREHOUSE_ICON_KEYS)[number];
export const DEFAULT_WAREHOUSE_ICON: WarehouseIconKey = "warehouse";
export const DEFAULT_WAREHOUSE_COLOR = "#4f46e5";
export const WAREHOUSE_COLORS = [
  { value: "#4f46e5", label: "Indigo" },
  { value: "#2563eb", label: "Biru" },
  { value: "#0891b2", label: "Sian" },
  { value: "#059669", label: "Hijau" },
  { value: "#ca8a04", label: "Kuning" },
  { value: "#ea580c", label: "Oranye" },
  { value: "#dc2626", label: "Merah" },
  { value: "#9333ea", label: "Ungu" },
] as const;
