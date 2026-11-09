import type { Metadata } from "next";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { createLoader } from "nuqs/server";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes, outlets, warehouses } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { toFileSrc } from "@/lib/files";

import { ALL_WAREHOUSES, NO_WAREHOUSE, OUTLET_PAGE_SIZE, outletListParsers } from "./list-query";
import { OutletsClient } from "./outlets-client";
import type { OutletListRow } from "./types";

export const metadata: Metadata = { title: "Outlet" };

const loadListQuery = createLoader(outletListParsers);
const sortColumns = {
  name: outlets.name,
  type: outletTypes.name,
  warehouse: warehouses.name,
  status: outlets.status,
};

export default async function OutletsPage({ searchParams }: PageProps<"/master-data/outlets">) {
  const user = await requirePermission("outlets");
  const organizationId = user.organization.id;
  const { q, warehouse, status, page, sort, dir } = await loadListQuery(searchParams);
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
  const total = totals.total;
  const totalPages = Math.max(1, Math.ceil(total / OUTLET_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
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
    .limit(OUTLET_PAGE_SIZE)
    .offset((currentPage - 1) * OUTLET_PAGE_SIZE);

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
      <OutletsClient
        outlets={outletsList}
        warehouses={warehouseRows}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
