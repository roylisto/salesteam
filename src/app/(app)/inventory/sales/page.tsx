import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";

export default async function SalesInventoryPage() {
  await requirePermission("sales_inventory");
  return <div>
    <PageHeader title="Stok Sales" description="Manajemen stok tenaga penjualan." />
    <p className="text-muted-foreground rounded-xl border p-6 text-sm">Fitur Stok Sales akan tersedia pada tahap berikutnya.</p>
  </div>;
}
