import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { STOCK_PATH } from "@/lib/stock";
import { stockOptions } from "../data";
import { StockForm } from "./stock-form";

export default async function NewStockPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("warehouse_movements");
  const params = await searchParams;
  const type = params.type === "out" ? "out" : "in";
  const options = await stockOptions(user.organization.id, true);
  let date: string;
  try {
    date = new Intl.DateTimeFormat("sv-SE", { timeZone: user.organization.timezone }).format(new Date());
  } catch {
    date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
  }
  return <div className="w-full">
    <PageHeader title={type === "in" ? "Stock In" : "Stock Out"}
      description={type === "in" ? "Catat penerimaan barang ke gudang." : "Transfer barang dari gudang asal ke gudang tujuan."}>
      <Button variant="outline" render={<Link href={STOCK_PATH} />} nativeButton={false}>Kembali</Button>
    </PageHeader>
    <StockForm key={type} type={type} options={options} defaultDate={date} />
  </div>;
}
