import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notDeleted, outletTypes, outlets, users, warehouses } from "@/db/schema";

import type {
  MemberOption,
  OutletDetail,
  OutletTypeOption,
  WarehouseOption,
} from "./types";

/** Warehouse / rep / outlet-type choices shared by the create and edit pages. */
export async function loadFormOptions(organizationId: number): Promise<{
  warehouses: WarehouseOption[];
  members: MemberOption[];
  outletTypes: OutletTypeOption[];
}> {
  const [warehouseRows, memberRows, outletTypeRows] = await Promise.all([
    db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(
        and(eq(warehouses.organizationId, organizationId), notDeleted(warehouses)),
      )
      .orderBy(asc(warehouses.name)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true),
          notDeleted(users),
        ),
      )
      .orderBy(asc(users.name)),
    db
      .select({ id: outletTypes.id, name: outletTypes.name })
      .from(outletTypes)
      .where(
        and(eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)),
      )
      .orderBy(asc(outletTypes.name)),
  ]);

  return {
    warehouses: warehouseRows,
    members: memberRows,
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
      salesId: outlets.salesId,
      salesName: users.name,
      outletTypeId: outlets.outletTypeId,
      outletTypeName: outletTypes.name,
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
    .leftJoin(users, and(eq(outlets.salesId, users.id), notDeleted(users)))
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
