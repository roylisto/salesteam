export const OUTLET_ICON_KEYS = [
  "store",
  "shopping-basket",
  "shopping-cart",
  "utensils",
  "coffee",
  "building",
  "shopping-bag",
  "shirt",
  "pill",
  "cake-slice",
  "sandwich",
  "hotel",
  "fuel",
  "book-open",
  "smartphone",
  "flower",
  "hammer",
  "ice-cream-cone",
] as const;
export type OutletIconKey = (typeof OUTLET_ICON_KEYS)[number];
export const DEFAULT_OUTLET_ICON: OutletIconKey = "store";
export const DEFAULT_OUTLET_COLOR = "#4f46e5";
export const OUTLET_COLORS = [
  { value: "#4f46e5", label: "Indigo" },
  { value: "#2563eb", label: "Biru" },
  { value: "#0891b2", label: "Sian" },
  { value: "#059669", label: "Hijau" },
  { value: "#ca8a04", label: "Kuning" },
  { value: "#ea580c", label: "Oranye" },
  { value: "#dc2626", label: "Merah" },
  { value: "#9333ea", label: "Ungu" },
] as const;
