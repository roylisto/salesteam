import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { orderOptions } from "@/lib/order-data";
import { OrderForm } from "./order-form";

export default async function NewOrderPage() {
  const actor = await requirePermission("orders");
  const options = await orderOptions(actor);
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: actor.organization.timezone }).format(new Date());
  return <div><PageHeader title="Order / Penawaran Baru" description="Harga mengikuti tipe outlet dengan prioritas gudang, area gudang, lalu global.">
    <Button variant="outline" render={<Link href="/orders" />} nativeButton={false}>Kembali</Button></PageHeader>
    <OrderForm options={options} date={date} /></div>;
}
