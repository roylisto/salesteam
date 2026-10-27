import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices, notDeleted, warehouses } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { WarehousesClient } from "./warehouses-client";
import type { AreaOption, WarehouseRow } from "./types";

export const metadata: Metadata = { title: "Gudang" };

export default async function WarehousesPage() {
  const user = await requirePermission("warehouses");
  const { organization } = user;

  const areaRows = await db
    .select({ id: areaOffices.id, name: areaOffices.name })
    .from(areaOffices)
    .where(
      and(eq(areaOffices.organizationId, organization.id), notDeleted(areaOffices)),
    )
    .orderBy(asc(areaOffices.name));

  const warehouseRows = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      depotType: warehouses.depotType,
      isActive: warehouses.isActive,
      areaOfficeId: warehouses.areaOfficeId,
      areaName: areaOffices.name,
      createdAt: warehouses.createdAt,
      updatedAt: warehouses.updatedAt,
    })
    .from(warehouses)
    .leftJoin(areaOffices, eq(warehouses.areaOfficeId, areaOffices.id))
    .where(
      and(eq(warehouses.organizationId, organization.id), notDeleted(warehouses)),
    )
    .orderBy(asc(warehouses.name));

  const areas: AreaOption[] = areaRows;
  const warehousesList: WarehouseRow[] = warehouseRows.map((warehouse) => ({
    ...warehouse,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Gudang"
        description="Depo yang menyimpan stok, dikelompokkan di bawah setiap area."
      />
      <WarehousesClient warehouses={warehousesList} areas={areas} />
    </div>
  );
}
