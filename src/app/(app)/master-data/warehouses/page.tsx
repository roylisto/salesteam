import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import {
  areaOffices,
  notDeleted,
  organizations,
  users,
  warehouses,
  warehouseTypes,
} from "@/db/schema";
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

  // Fetch organization's default province/city for map centering
  const [org] = await db
    .select({ province: organizations.province, city: organizations.city, name: organizations.name, address: organizations.address, latitude: organizations.latitude, longitude: organizations.longitude })
    .from(organizations)
    .where(and(eq(organizations.id, organization.id), notDeleted(organizations)))
    .limit(1);

  const warehouseRows = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      warehouseTypeId: warehouses.warehouseTypeId,
      warehouseTypeName: warehouseTypes.name,
      warehouseTypeColor: warehouseTypes.color,
      warehouseTypeIcon: warehouseTypes.icon,
      isActive: warehouses.isActive,
      areaOfficeId: warehouses.areaOfficeId,
      areaName: areaOffices.name,
      picUserId: warehouses.picUserId,
      picName: users.name,
      address: warehouses.address,
      province: warehouses.province,
      regency: warehouses.regency,
      district: warehouses.district,
      village: warehouses.village,
      postalCode: warehouses.postalCode,
      latitude: warehouses.latitude,
      longitude: warehouses.longitude,
      createdAt: warehouses.createdAt,
      updatedAt: warehouses.updatedAt,
    })
    .from(warehouses)
    .leftJoin(areaOffices, and(eq(warehouses.areaOfficeId, areaOffices.id), eq(areaOffices.organizationId, organization.id), notDeleted(areaOffices)))
    .leftJoin(users, and(eq(warehouses.picUserId, users.id), eq(users.organizationId, organization.id), notDeleted(users)))
    .leftJoin(warehouseTypes, and(eq(warehouses.warehouseTypeId, warehouseTypes.id), eq(warehouseTypes.organizationId, organization.id), notDeleted(warehouseTypes)))
    .where(
      and(eq(warehouses.organizationId, organization.id), notDeleted(warehouses)),
    )
    .orderBy(asc(warehouses.name));

  const areas: AreaOption[] = areaRows;
  const warehousesList: WarehouseRow[] = warehouseRows.map((warehouse) => ({
    ...warehouse,
    latitude: warehouse.latitude,
    longitude: warehouse.longitude,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Gudang"
        description="Depo yang menyimpan stok, dikelompokkan di bawah setiap area."
      />
      <WarehousesClient
        headOffice={org ?? { name: organization.name, address: null, latitude: null, longitude: null }}
        warehouses={warehousesList}
        areas={areas}
        orgProvince={org?.province ?? null}
        orgCity={org?.city ?? null}
      />
    </div>
  );
}
