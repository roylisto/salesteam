import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  areaOffices,
  notDeleted,
  users,
  warehouses,
  warehouseTypes,
} from "@/db/schema";

import type {
  AreaOption,
  BackOfficeUserOption,
  WarehouseDetail,
  WarehouseTypeOption,
} from "./types";

/** Area / type / PIC choices shared by the create and edit pages. */
export async function loadFormOptions(organizationId: number): Promise<{
  areas: AreaOption[];
  warehouseTypes: WarehouseTypeOption[];
  backOfficeUsers: BackOfficeUserOption[];
}> {
  const [areaRows, typeRows, picRows] = await Promise.all([
    db
      .select({ id: areaOffices.id, name: areaOffices.name })
      .from(areaOffices)
      .where(
        and(
          eq(areaOffices.organizationId, organizationId),
          notDeleted(areaOffices),
        ),
      )
      .orderBy(asc(areaOffices.name)),
    db
      .select({ id: warehouseTypes.id, name: warehouseTypes.name })
      .from(warehouseTypes)
      .where(
        and(
          eq(warehouseTypes.organizationId, organizationId),
          notDeleted(warehouseTypes),
        ),
      )
      .orderBy(asc(warehouseTypes.name)),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.userType, "back_office"),
          notDeleted(users),
        ),
      )
      .orderBy(asc(users.name)),
  ]);

  return {
    areas: areaRows,
    warehouseTypes: typeRows,
    backOfficeUsers: picRows,
  };
}

/** Full warehouse record for the edit page, or null when it is missing/deleted. */
export async function loadWarehouseDetail(
  organizationId: number,
  id: number,
): Promise<WarehouseDetail | null> {
  const [row] = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      warehouseTypeId: warehouses.warehouseTypeId,
      isActive: warehouses.isActive,
      areaOfficeId: warehouses.areaOfficeId,
      picUserId: warehouses.picUserId,
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
    .where(
      and(
        eq(warehouses.id, id),
        eq(warehouses.organizationId, organizationId),
        notDeleted(warehouses),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
