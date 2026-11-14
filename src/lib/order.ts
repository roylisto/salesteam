export const ORDER_PATH = "/orders";
export const ORDER_STATUSES = ["quotation", "confirmed", "fulfilled", "cancelled"] as const;
export function orderStatusLabel(status: string) {
  return ({ quotation: "Penawaran", confirmed: "Menunggu Penyerahan", fulfilled: "Sudah Diserahkan", cancelled: "Dibatalkan" } as Record<string, string>)[status] ?? status;
}
export function cents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function fromCents(value: bigint) { return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`; }
export function fromMicros(value: bigint) { return `${value / BigInt(1_000_000)}.${(value % BigInt(1_000_000)).toString().padStart(6, "0")}`; }
export function formatMoney(value: string, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value as `${number}`);
}
