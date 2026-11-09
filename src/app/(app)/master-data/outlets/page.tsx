import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes, outlets, warehouses } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OutletsClient } from "./outlets-client";
import type { OutletRow, WarehouseOption } from "./types";

export const metadata: Metadata = { title: "Outlet" };

export default async function OutletsPage() {
  const user = await requirePermission("outlets");
  const { organization } = user;

  const [warehouseRows, outletRows] = await Promise.all([
    db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.organizationId, organization.id),
          notDeleted(warehouses),
        ),
      )
      .orderBy(asc(warehouses.name)),
    db
      .select({
        id: outlets.id,
        code: outlets.code,
        name: outlets.name,
        status: outlets.status,
        warehouseId: outlets.warehouseId,
        warehouseName: warehouses.name,
        outletTypeId: outlets.outletTypeId,
        outletTypeName: outletTypes.name,
      outletTypeColor: outletTypes.color,
      outletTypeIcon: outletTypes.icon,
        city: outlets.city,
        province: outlets.province,
        createdAt: outlets.createdAt,
        updatedAt: outlets.updatedAt,
      })
      .from(outlets)
      .leftJoin(
        warehouses,
        and(eq(outlets.warehouseId, warehouses.id), notDeleted(warehouses)),
      )
      .leftJoin(
        outletTypes,
        and(eq(outlets.outletTypeId, outletTypes.id), notDeleted(outletTypes)),
      )
      .where(and(eq(outlets.organizationId, organization.id), notDeleted(outlets)))
      .orderBy(asc(outlets.name)),
  ]);

  const warehouseOptions: WarehouseOption[] = warehouseRows;
  const outletsList: OutletRow[] = outletRows.map((outlet) => ({
    ...outlet,
    createdAt: outlet.createdAt.toISOString(),
    updatedAt: outlet.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Outlet"
        description="Toko pelanggan yang dikunjungi tenaga penjualan, beserta gudang yang melayaninya."
      />
      <OutletsClient
        outlets={outletsList}
        warehouses={warehouseOptions}
      />
    </div>
  );
}
