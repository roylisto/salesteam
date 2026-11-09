import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, warehouseTypes } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { WarehouseTypesClient } from "./warehouse-types-client";
import type { WarehouseTypeRow } from "./types";

export const metadata: Metadata = { title: "Tipe Gudang" };

export default async function WarehouseTypesPage({ searchParams }: PageProps<"/master-data/warehouse-types">) {
  const user = await requirePermission("warehouse_types");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="warehouse_types" path="/master-data/warehouse-types" title="Tipe Gudang" label="Daftar Tipe Gudang" params={params} />;
  }
  const { organization } = user;

  const rows = await db
    .select({
      id: warehouseTypes.id,
      name: warehouseTypes.name,
      color: warehouseTypes.color,
      icon: warehouseTypes.icon,
      isActive: warehouseTypes.isActive,
      createdAt: warehouseTypes.createdAt,
      updatedAt: warehouseTypes.updatedAt,
    })
    .from(warehouseTypes)
    .where(
      and(
        eq(warehouseTypes.organizationId, organization.id),
        notDeleted(warehouseTypes),
      ),
    )
    .orderBy(asc(warehouseTypes.name));

  const warehouseTypesList: WarehouseTypeRow[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Tipe Gudang"
        description="Klasifikasikan gudang berdasarkan fungsinya (Utama, Transit, Cabang, ...)."
      />
      <AuditTabs path="/master-data/warehouse-types" label="Daftar Tipe Gudang" />
      <WarehouseTypesClient warehouseTypes={warehouseTypesList} />
    </div>
  );
}
