import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { SALES_STOCK_PATH } from "@/lib/stock";
import { StockForm } from "../../warehouses/new/stock-form";
import { salesOptions } from "../data";

export default async function NewSalesStockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("sales_inventory");
  await requirePermission("sales_stock");
  const params = await searchParams;
  const type = params.type === "out" ? "out" : "in";
  const options = await salesOptions(user, type);
  let date: string;
  try { date = new Intl.DateTimeFormat("sv-SE", { timeZone: user.organization.timezone }).format(new Date()); }
  catch { date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()); }
  return <div className="w-full">
    <PageHeader title={type === "in" ? "Pengambilan Stok Sales" : "Pengembalian Stok Sales"}
      description={type === "in" ? "Pindahkan stok gudang ke Sales." : "Kembalikan stok Sales ke gudang asal pengambilan."}>
      <Button variant="outline" render={<Link href={SALES_STOCK_PATH} />} nativeButton={false}>Kembali</Button>
    </PageHeader>
    <StockForm key={type} type={type} options={options} defaultDate={date} salesContext={{ sales: options.sales, origins: options.origins }} />
  </div>;
}
