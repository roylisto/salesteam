import type { Metadata } from "next";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices, notDeleted } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

import { AreasClient } from "./areas-client";
import type { AreaRow } from "./types";

export const metadata: Metadata = { title: "Manajemen Area" };

export default async function AreasPage({ searchParams }: PageProps<"/master-data/areas">) {
  const user = await requirePermission("areas");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="areas" path="/master-data/areas" title="Manajemen Area" label="Daftar Area" params={params} />;
  }
  const { organization } = user;

  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const scope = and(eq(areaOffices.organizationId, organization.id), notDeleted(areaOffices));
  const filters = and(scope, tableSearch(q, areaOffices.name));
  const [{ total }] = await db.select({ total: count() }).from(areaOffices).where(filters);
  const pagination = paginateTable(total, page, pageSize);
  const query = () => db
    .select({
      id: areaOffices.id,
      name: areaOffices.name,
      createdAt: areaOffices.createdAt,
      updatedAt: areaOffices.updatedAt,
    })
    .from(areaOffices);
  const rows = await query().where(filters)
    .orderBy(tableOrder({ name: sql`lower(${areaOffices.name})`, createdAt: areaOffices.createdAt }, sort, dir, asc(areaOffices.name)), asc(areaOffices.id))
    .limit(pageSize).offset(pagination.offset);

  const selectedId = typeof params.area === "string" ? Number(params.area) : NaN;
  const selected = rows.find((row) => row.id === selectedId) ?? (
    Number.isSafeInteger(selectedId) && selectedId > 0
      ? (await query().where(and(scope, eq(areaOffices.id, selectedId))).limit(1))[0]
      : undefined
  );
  const serialize = (row: (typeof rows)[number]): AreaRow => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  const areas = rows.map(serialize);

  return (
    <div className="w-full">
      <PageHeader
        title="Manajemen Area"
        description="Pengelompokan wilayah untuk gudang dan outlet di organisasi ini."
      />
      <AuditTabs path="/master-data/areas" label="Daftar Area" />
      <AreasClient areas={areas} pagination={pagination} selectedRow={selected ? serialize(selected) : null} />
    </div>
  );
}
