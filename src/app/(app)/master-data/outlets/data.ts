import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { areaOffices, notDeleted, outletTypes, outlets, warehouses } from "@/db/schema";

import type {
  AreaOption,
  OutletDetail,
  OutletTypeOption,
  WarehouseLocationOption,
} from "./types";

/** Area / warehouse / outlet-type choices shared by the create and edit pages. */
export async function loadFormOptions(organizationId: number): Promise<{
  areas: AreaOption[];
  warehouses: WarehouseLocationOption[];
  outletTypes: OutletTypeOption[];
}> {
  const [areaRows, warehouseRows, outletTypeRows] = await Promise.all([
    db
      .select({ id: areaOffices.id, name: areaOffices.name })
      .from(areaOffices)
      .where(and(eq(areaOffices.organizationId, organizationId), notDeleted(areaOffices)))
      .orderBy(asc(areaOffices.name)),
    db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        areaOfficeId: areaOffices.id,
        latitude: warehouses.latitude,
        longitude: warehouses.longitude,
      })
      .from(warehouses)
      .leftJoin(areaOffices, and(
        eq(warehouses.areaOfficeId, areaOffices.id),
        eq(areaOffices.organizationId, organizationId),
        notDeleted(areaOffices),
      ))
      .where(
        and(eq(warehouses.organizationId, organizationId), notDeleted(warehouses)),
      )
      .orderBy(asc(warehouses.name)),
    db
      .select({ id: outletTypes.id, name: outletTypes.name })
      .from(outletTypes)
      .where(
        and(eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)),
      )
      .orderBy(asc(outletTypes.name)),
  ]);

  return {
    areas: areaRows,
    warehouses: warehouseRows,
    outletTypes: outletTypeRows,
  };
}

/** Full outlet record for the edit page, or null when it is missing/deleted. */
export async function loadOutletDetail(
  organizationId: number,
  id: number,
): Promise<OutletDetail | null> {
  const [row] = await db
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
      imageUrl: outlets.imageUrl,
      notes: outlets.notes,
      address: outlets.address,
      addressDetail: outlets.addressDetail,
      latitude: outlets.latitude,
      longitude: outlets.longitude,
      country: outlets.country,
      district: outlets.district,
      village: outlets.village,
      postalCode: outlets.postalCode,
      ownerName: outlets.ownerName,
      ownerAddress: outlets.ownerAddress,
      phone: outlets.phone,
      email: outlets.email,
      nationalId: outlets.nationalId,
      taxId: outlets.taxId,
      familyCardNumber: outlets.familyCardNumber,
      businessId: outlets.businessId,
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
    .where(
      and(
        eq(outlets.id, id),
        eq(outlets.organizationId, organizationId),
        notDeleted(outlets),
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
