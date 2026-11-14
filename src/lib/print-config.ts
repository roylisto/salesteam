import { z } from "zod";

export const DEFAULT_PRINT_SETTINGS = { paper: "80", width: 80, margin: 3, fontSize: 11, template: "compact", header: "", footer: "Terima kasih atas kepercayaan Anda.", showLogo: true, showSku: true, showAddress: true };
export const printSettingsSchema = z.object({
  paper: z.enum(["58", "76", "80", "A4", "custom"]), width: z.number().int().min(48).max(210),
  margin: z.number().int().min(0).max(20), fontSize: z.number().int().min(8).max(16),
  template: z.enum(["compact", "detailed"]), header: z.string().trim().max(200), footer: z.string().trim().max(1000),
  showLogo: z.boolean(), showSku: z.boolean(), showAddress: z.boolean(),
}).transform((value) => ({ ...value, width: value.paper === "custom" ? value.width : value.paper === "A4" ? 210 : Number(value.paper) }))
  .refine((value) => value.width - value.margin * 2 >= 40, "Lebar isi cetak minimal 40 mm.");
export type PrintSettings = z.output<typeof printSettingsSchema>;
export type PrintDocument = {
  kind: string; title: string; number: string; orderNumber: string; date: string; dueDate: string | null;
  company: string; companyAddress: string; phone: string; logo: string | null; customer: string; address: string; sales: string;
  warehouse: string; currency: string; notes: string | null; status: string;
  items: { name: string; code: string | null; quantity: string; unit: string; price: string; subtotal: string }[];
  total: string; paid: string; outstanding: string;
};
export const PRINT_TITLES: Record<string, string> = { quotation: "PENAWARAN HARGA", proforma: "PROFORMA INVOICE", order: "SALES ORDER", invoice: "INVOICE / FAKTUR PENJUALAN", receipt: "NOTA LUNAS" };
export const SAMPLE_DOCUMENT: PrintDocument = {
  kind: "receipt", title: "NOTA LUNAS · CONTOH", number: "INV-CONTOH-000001", orderNumber: "SO-CONTOH-000001", date: "14 November 2026", dueDate: null,
  company: "Contoh Distributor", companyAddress: "Jl. Contoh No. 1", phone: "0812 0000 0000", logo: null, customer: "Toko Pelanggan", address: "Alamat pelanggan", sales: "Sales Contoh",
  warehouse: "Gudang Contoh", currency: "IDR", notes: null, status: "LUNAS", items: [
    { name: "Produk contoh dengan nama panjang", code: "SKU-001", quantity: "2", unit: "PCS", price: "12500.00", subtotal: "25000.00" },
    { name: "Produk kemasan", code: "SKU-002", quantity: "1", unit: "DUS", price: "50000.00", subtotal: "50000.00" },
  ], total: "75000.00", paid: "75000.00", outstanding: "0.00",
};
