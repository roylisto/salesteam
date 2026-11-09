import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OutletTypesClient } from "./outlet-types-client";
import type { OutletTypeRow } from "./types";

export const metadata: Metadata = { title: "Tipe Outlet" };

export default async function OutletTypesPage({ searchParams }: PageProps<"/master-data/outlet-types">) {
  const user = await requirePermission("outlet_types");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="outlet_types" path="/master-data/outlet-types" title="Tipe Outlet" label="Daftar Tipe Outlet" params={params} />;
  }
  const { organization } = user;

  const rows = await db
    .select({
      id: outletTypes.id,
      name: outletTypes.name,
      color: outletTypes.color,
      icon: outletTypes.icon,
      isActive: outletTypes.isActive,
      createdAt: outletTypes.createdAt,
      updatedAt: outletTypes.updatedAt,
    })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.organizationId, organization.id),
        notDeleted(outletTypes),
      ),
    )
    .orderBy(asc(outletTypes.name));

  const outletTypesList: OutletTypeRow[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Tipe Outlet"
        description="Klasifikasikan outlet berdasarkan saluran penjualan (Retail, Grosir, Horeca, ...)."
      />
      <AuditTabs path="/master-data/outlet-types" label="Daftar Tipe Outlet" />
      <OutletTypesClient outletTypes={outletTypesList} />
    </div>
  );
}
