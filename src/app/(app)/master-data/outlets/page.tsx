import type { Metadata } from "next";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { createLoader } from "nuqs/server";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes, outlets } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { paginateTable } from "@/lib/table-query";
import { toFileSrc } from "@/lib/files";

import { outletListParsers } from "./list-query";
import { OutletsClient } from "./outlets-client";
import { OutletMapControls } from "./outlet-map-controls";
import type { OutletListRow } from "./types";

export const metadata: Metadata = { title: "Outlet" };

const OUTLETS_PATH = "/master-data/outlets";
const loadListQuery = createLoader(outletListParsers);
const sortColumns = {
  name: outlets.name,
  type: outletTypes.name,
  status: outlets.status,
};

export default async function OutletsPage({ searchParams }: PageProps<"/master-data/outlets">) {
  const user = await requirePermission("outlets");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="outlets" path={OUTLETS_PATH} title="Outlet"
      label="Daftar Outlet" params={params} map mapLabel="Peta Outlet" />;
  }
  const organizationId = user.organization.id;
  if (params.tab === "map") {
    const types = await db.select({ id: outletTypes.id, name: outletTypes.name }).from(outletTypes)
      .where(and(eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)))
      .orderBy(asc(outletTypes.name));

    return (
      <div className="w-full">
        <PageHeader title="Outlet" description="Lihat sebaran outlet berdasarkan lokasi dan wilayah." />
        <AuditTabs path={OUTLETS_PATH} label="Daftar Outlet" map mapLabel="Peta Outlet" />
        <OutletMapControls types={types} />
      </div>
    );
  }
  const { q, status, page, pageSize, sort, dir } = loadListQuery(params);
  const needle = q.trim();
  const filters = and(
    eq(outlets.organizationId, organizationId),
    notDeleted(outlets),
    status === "all" ? undefined : eq(outlets.status, status),
    needle ? sql`(
      strpos(lower(${outlets.name}), lower(${needle})) > 0 OR
      strpos(lower(${outlets.code}), lower(${needle})) > 0
    )` : undefined,
  );

  const [totals] = await db.select({ total: count() }).from(outlets).where(filters);
  const pagination = paginateTable(totals.total, page, pageSize);
  const order = dir === "desc" ? sql`desc` : sql`asc`;
  const rows = await db
    .select({
      id: outlets.id,
      code: outlets.code,
      name: outlets.name,
      status: outlets.status,
      outletTypeName: outletTypes.name,
      outletTypeColor: outletTypes.color,
      outletTypeIcon: outletTypes.icon,
      imageUrl: outlets.imageUrl,
    })
    .from(outlets)
    .leftJoin(outletTypes, and(
      eq(outlets.outletTypeId, outletTypes.id),
      eq(outletTypes.organizationId, organizationId),
      notDeleted(outletTypes),
    ))
    .where(filters)
    .orderBy(sql`lower(${sortColumns[sort]}) ${order} nulls last`, asc(outlets.id))
    .limit(pageSize)
    .offset(pagination.offset);

  const outletsList: OutletListRow[] = rows.map(({ imageUrl, ...row }) => {
    const src = toFileSrc(imageUrl);
    return { ...row, thumbnailSrc: src ? `${src}?thumbnail=outlet` : null };
  });

  return (
    <div className="w-full">
      <PageHeader
        title="Outlet"
        description="Toko pelanggan yang dikunjungi tenaga penjualan."
      />
      <AuditTabs path={OUTLETS_PATH} label="Daftar Outlet" map mapLabel="Peta Outlet" />
      <OutletsClient
        outlets={outletsList}
        pagination={pagination}
      />
    </div>
  );
}
