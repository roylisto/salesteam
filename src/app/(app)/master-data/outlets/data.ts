import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notDeleted, outletTypes, outlets } from "@/db/schema";

import type { OutletDetail, OutletTypeOption } from "./types";

export async function loadFormOptions(organizationId: number): Promise<{ outletTypes: OutletTypeOption[] }> {
  const types = await db.select({ id: outletTypes.id, name: outletTypes.name })
    .from(outletTypes)
    .where(and(eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)))
    .orderBy(asc(outletTypes.name));

  return { outletTypes: types };
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
