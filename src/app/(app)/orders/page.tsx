import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { AuditHistoryPage } from "@/components/audit-history";
import { PageHeader } from "@/components/page-header";
import { AuditTabs } from "@/components/audit-tabs";
import { auditLogs, orders } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { orderSalesScope } from "@/lib/order-access";
import { orderList, orderOptions } from "@/lib/order-data";
import { OrdersClient } from "./orders-client";

export const metadata: Metadata = { title: "Order Penjualan" };
export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("orders");
  const params = await searchParams;
  const scope = orderSalesScope(user, orders.salesId);
  if (params.tab === "audit") return <AuditHistoryPage user={user} module="orders" path="/orders" title="Order Penjualan" params={params}
    entityFilter={scope ? sql`${auditLogs.entityId} in (select ${orders.id} from ${orders} where ${orders.organizationId} = ${user.organization.id} and ${scope})` : undefined} />;
  const [data, options] = await Promise.all([orderList(user, params), orderOptions(user)]);
  return <div className="space-y-3"><PageHeader title="Order Penjualan" description="Penawaran, pesanan, penyerahan barang, invoice dan pembayaran dari stok Sales." />
    <AuditTabs path="/orders" /><OrdersClient data={data} sales={options.sales} timezone={user.organization.timezone} /></div>;
}
