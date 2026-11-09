import type { Metadata } from "next";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

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

  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const scope = and(eq(outletTypes.organizationId, organization.id), notDeleted(outletTypes));
  const filters = and(scope, tableSearch(q, outletTypes.name));
  const [{ total }] = await db.select({ total: count() }).from(outletTypes).where(filters);
  const pagination = paginateTable(total, page, pageSize);
  const query = () => db
    .select({
      id: outletTypes.id,
      name: outletTypes.name,
      color: outletTypes.color,
      icon: outletTypes.icon,
      isActive: outletTypes.isActive,
      createdAt: outletTypes.createdAt,
      updatedAt: outletTypes.updatedAt,
    })
    .from(outletTypes);
  const rows = await query().where(filters)
    .orderBy(tableOrder({ name: sql`lower(${outletTypes.name})`, createdAt: outletTypes.createdAt, status: outletTypes.isActive }, sort, dir, asc(outletTypes.name)), asc(outletTypes.id))
    .limit(pageSize).offset(pagination.offset);

  const selectedId = typeof params.outletType === "string" ? Number(params.outletType) : NaN;
  const selected = rows.find((row) => row.id === selectedId) ?? (
    Number.isSafeInteger(selectedId) && selectedId > 0
      ? (await query().where(and(scope, eq(outletTypes.id, selectedId))).limit(1))[0]
      : undefined
  );
  const serialize = (row: (typeof rows)[number]): OutletTypeRow => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  const outletTypesList = rows.map(serialize);

  return (
    <div className="w-full">
      <PageHeader
        title="Tipe Outlet"
        description="Klasifikasikan outlet berdasarkan saluran penjualan (Retail, Grosir, Horeca, ...)."
      />
      <AuditTabs path="/master-data/outlet-types" label="Daftar Tipe Outlet" />
      <OutletTypesClient outletTypes={outletTypesList} pagination={pagination} selectedRow={selected ? serialize(selected) : null} />
    </div>
  );
}
