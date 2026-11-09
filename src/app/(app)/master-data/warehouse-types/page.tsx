import type { Metadata } from "next";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, warehouseTypes } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

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

  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const scope = and(eq(warehouseTypes.organizationId, organization.id), notDeleted(warehouseTypes));
  const filters = and(scope, tableSearch(q, warehouseTypes.name));
  const [{ total }] = await db.select({ total: count() }).from(warehouseTypes).where(filters);
  const pagination = paginateTable(total, page, pageSize);
  const query = () => db
    .select({
      id: warehouseTypes.id,
      name: warehouseTypes.name,
      color: warehouseTypes.color,
      icon: warehouseTypes.icon,
      isActive: warehouseTypes.isActive,
      createdAt: warehouseTypes.createdAt,
      updatedAt: warehouseTypes.updatedAt,
    })
    .from(warehouseTypes);
  const rows = await query().where(filters)
    .orderBy(tableOrder({ name: sql`lower(${warehouseTypes.name})`, createdAt: warehouseTypes.createdAt, status: warehouseTypes.isActive }, sort, dir, asc(warehouseTypes.name)), asc(warehouseTypes.id))
    .limit(pageSize).offset(pagination.offset);

  const selectedId = typeof params.warehouseType === "string" ? Number(params.warehouseType) : NaN;
  const selected = rows.find((row) => row.id === selectedId) ?? (
    Number.isSafeInteger(selectedId) && selectedId > 0
      ? (await query().where(and(scope, eq(warehouseTypes.id, selectedId))).limit(1))[0]
      : undefined
  );
  const serialize = (row: (typeof rows)[number]): WarehouseTypeRow => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  const warehouseTypesList = rows.map(serialize);

  return (
    <div className="w-full">
      <PageHeader
        title="Tipe Gudang"
        description="Klasifikasikan gudang berdasarkan fungsinya (Utama, Transit, Cabang, ...)."
      />
      <AuditTabs path="/master-data/warehouse-types" label="Daftar Tipe Gudang" />
      <WarehouseTypesClient warehouseTypes={warehouseTypesList} pagination={pagination} selectedRow={selected ? serialize(selected) : null} />
    </div>
  );
}
