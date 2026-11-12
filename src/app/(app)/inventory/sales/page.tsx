import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { AuditHistoryPage } from "@/components/audit-history";
import { PageHeader } from "@/components/page-header";
import { auditLogs, salesStocks } from "@/db/schema";
import { can, requirePermission } from "@/lib/auth";
import { salesStockOwner } from "@/lib/sales-stock-policy";
import { SALES_STOCK_PATH } from "@/lib/stock";
import { salesBalance, salesHistory, salesOptions } from "./data";
import { SalesTabs } from "./sales-tabs";
import { SalesClient } from "./sales-client";

export const metadata: Metadata = { title: "Stok Sales" };

export default async function SalesStockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("sales_inventory");
  const params = await searchParams;
  const owner = salesStockOwner(user);
  if (params.tab === "audit") return <AuditHistoryPage user={user} module="sales_inventory" path={SALES_STOCK_PATH}
    title="Stok Sales" params={params} tabs={<SalesTabs />} entityFilter={owner === undefined ? undefined :
      sql`${auditLogs.entityId} in (select ${salesStocks.id} from ${salesStocks} where ${salesStocks.organizationId} = ${user.organization.id} and ${salesStocks.salesId} = ${owner})`} />;
  const [options, balances, history] = await Promise.all([
    salesOptions(user), params.tab === "history" ? null : salesBalance(user, params),
    params.tab === "history" ? salesHistory(user, params) : null,
  ]);
  return <div className="w-full">
    <PageHeader title="Stok Sales" description="Catat pengambilan stok dari gudang dan pengembalian ke gudang asal." />
    <SalesTabs />
    <SalesClient options={options} balances={balances} history={history} canTransact={can(user, "sales_stock")} />
  </div>;
}
