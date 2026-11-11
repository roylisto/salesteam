import type { Metadata } from "next";
import { AuditHistoryPage } from "@/components/audit-history";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { STOCK_PATH } from "@/lib/stock";
import { stockBalance, stockHistory, stockOptions } from "./data";
import { StockClient } from "./stock-client";
import { StockTabs } from "./stock-tabs";
import { StockSummary } from "./stock-summary";

export const metadata: Metadata = { title: "Stok Gudang" };

export default async function WarehouseStockPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("warehouse_movements");
  const params = await searchParams;
  if (params.tab === "audit") return <AuditHistoryPage user={user} module="warehouse_movements"
    path={STOCK_PATH} title="Stok Gudang" params={params} tabs={<StockTabs />} />;
  const orgId = user.organization.id;
  if (params.tab === "summary") return <div className="w-full">
    <PageHeader title="Stok Gudang" description="Lihat jumlah stok per gudang, per SKU, dan sebaran SKU di setiap gudang." />
    <StockTabs />
    <StockSummary organizationId={orgId} params={params} />
  </div>;
  const [options, balances, history] = await Promise.all([
    stockOptions(orgId),
    params.tab === "history" ? null : stockBalance(orgId, params),
    params.tab === "history" ? stockHistory(orgId, params) : null,
  ]);
  return <div className="w-full">
    <PageHeader title="Stok Gudang" description="Kelola stok masuk dan transfer stok antargudang dalam satuan dasar produk." />
    <StockTabs />
    <StockClient options={options} balances={balances} history={history} />
  </div>;
}
