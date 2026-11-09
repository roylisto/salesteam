import type { Metadata } from "next";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { createLoader } from "nuqs/server";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices, notDeleted, outletTypes, outlets, warehouses } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { paginateTable } from "@/lib/table-query";
import { toFileSrc } from "@/lib/files";

import { ALL_WAREHOUSES, NO_WAREHOUSE, outletListParsers } from "./list-query";
import { OutletsClient } from "./outlets-client";
import { OutletMapControls } from "./outlet-map-controls";
import type { OutletListRow } from "./types";

export const metadata: Metadata = { title: "Outlet" };

const OUTLETS_PATH = "/master-data/outlets";
const loadListQuery = createLoader(outletListParsers);
const sortColumns = {
  name: outlets.name,
  type: outletTypes.name,
  warehouse: warehouses.name,
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
    const [areas, warehouseOptions, types] = await Promise.all([
      db.select({ id: areaOffices.id, name: areaOffices.name }).from(areaOffices)
        .where(and(eq(areaOffices.organizationId, organizationId), notDeleted(areaOffices)))
        .orderBy(asc(areaOffices.name)),
      db.select({ id: warehouses.id, name: warehouses.name, areaOfficeId: warehouses.areaOfficeId })
        .from(warehouses).where(and(eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
        .orderBy(asc(warehouses.name)),
      db.select({ id: outletTypes.id, name: outletTypes.name }).from(outletTypes)
        .where(and(eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)))
        .orderBy(asc(outletTypes.name)),
    ]);

    return (
      <div className="w-full">
        <PageHeader title="Outlet" description="Lihat sebaran outlet berdasarkan lokasi dan wilayah." />
        <AuditTabs path={OUTLETS_PATH} label="Daftar Outlet" map mapLabel="Peta Outlet" />
        <OutletMapControls areas={areas} warehouses={warehouseOptions} types={types} />
      </div>
    );
  }
  const { q, warehouse, status, page, pageSize, sort, dir } = loadListQuery(params);
  const needle = q.trim();
  const warehouseId = Number(warehouse);
  const warehouseCondition = warehouse === ALL_WAREHOUSES
    ? undefined
    : warehouse === NO_WAREHOUSE
      ? isNull(outlets.warehouseId)
      : Number.isSafeInteger(warehouseId) && warehouseId > 0
        ? eq(outlets.warehouseId, warehouseId)
        : sql`false`;
  const filters = and(
    eq(outlets.organizationId, organizationId),
    notDeleted(outlets),
    warehouseCondition,
    status === "all" ? undefined : eq(outlets.status, status),
    needle ? sql`(
      strpos(lower(${outlets.name}), lower(${needle})) > 0 OR
      strpos(lower(${outlets.code}), lower(${needle})) > 0
    )` : undefined,
  );

  const [warehouseRows, [totals]] = await Promise.all([
    db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(and(eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
      .orderBy(asc(warehouses.name)),
    db.select({ total: count() }).from(outlets).where(filters),
  ]);
  const pagination = paginateTable(totals.total, page, pageSize);
  const order = dir === "desc" ? sql`desc` : sql`asc`;
  const rows = await db
    .select({
      id: outlets.id,
      code: outlets.code,
      name: outlets.name,
      status: outlets.status,
      warehouseName: warehouses.name,
      outletTypeName: outletTypes.name,
      outletTypeColor: outletTypes.color,
      outletTypeIcon: outletTypes.icon,
      imageUrl: outlets.imageUrl,
    })
    .from(outlets)
    .leftJoin(warehouses, and(
      eq(outlets.warehouseId, warehouses.id),
      eq(warehouses.organizationId, organizationId),
      notDeleted(warehouses),
    ))
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
        description="Toko pelanggan yang dikunjungi tenaga penjualan, beserta gudang yang melayaninya."
      />
      <AuditTabs path={OUTLETS_PATH} label="Daftar Outlet" map mapLabel="Peta Outlet" />
      <OutletsClient
        outlets={outletsList}
        warehouses={warehouseRows}
        pagination={pagination}
      />
    </div>
  );
}
