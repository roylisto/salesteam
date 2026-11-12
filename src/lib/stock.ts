export const STOCK_PATH = "/inventory/warehouses";
export const SALES_STOCK_PATH = "/inventory/sales";

export type SalesStockContext = {
  sales: StockOption[];
  origins: { salesId: number; warehouseId: number | null }[];
};

export function stockMovementLabel(type: "in" | "out", originalType?: "in" | "out" | null) {
  if (originalType) return originalType === "in" ? "Pembalikan Stock In" : "Pembalikan Stock Out";
  return type === "in" ? "Stock In" : "Stock Out";
}

export function stockStatusLabel(status: string) {
  if (status === "partially_reversed") return "Dibatalkan sebagian";
  if (status === "reversed") return "Dibatalkan";
  if (status === "completed") return "Selesai";
  return status === "draft" ? "Draf" : "Diproses";
}

export type StockReplacement = {
  id: number;
  number: string | null;
  warehouseId: number | null;
  destinationId: number | null;
  reference: string | null;
  quantities: Record<number, string>;
};

export function stockQuantity(value: string) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(value as `${number}`);
}

/** Exact six-decimal quantities without floating-point arithmetic. */
export function quantityMicros(value: string): bigint {
  if (value.startsWith("-")) return -quantityMicros(value.slice(1));
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}

export type StockProduct = {
  id: number;
  code: string | null;
  name: string;
  brand: string | null;
  type: string | null;
  unit: string;
  allowFraction: boolean;
  quantity: string;
};

export type StockOption = { id: number; name: string };
