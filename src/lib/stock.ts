export const STOCK_PATH = "/inventory/warehouses";

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
