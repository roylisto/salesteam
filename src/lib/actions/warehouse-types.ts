"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, warehouseTypes } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { toFieldErrors } from "@/lib/validation";

export type WarehouseTypeFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const WAREHOUSE_TYPES_PATH = "/master-data/warehouse-types";

async function requireWarehouseTypeManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouse_types")) return null;
  return user;
}

const WarehouseTypeSchema = z.object({
  name: z.string().trim().min(2, "Gunakan minimal 2 karakter.").max(150),
  isActive: z.boolean(),
});

function readForm(formData: FormData) {
  return WarehouseTypeSchema.safeParse({
    name: formData.get("name"),
    isActive: formData.get("isActive") === "true",
  });
}

export async function createWarehouseType(
  _state: WarehouseTypeFormState,
  formData: FormData,
): Promise<WarehouseTypeFormState> {
  const manager = await requireWarehouseTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe gudang." };
  }

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [existing] = await db
    .select({ id: warehouseTypes.id })
    .from(warehouseTypes)
    .where(
      and(
        eq(warehouseTypes.organizationId, manager.organization.id),
        eq(warehouseTypes.name, parsed.data.name),
        notDeleted(warehouseTypes),
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "Tipe gudang dengan nama ini sudah ada." } };
  }

  await db.insert(warehouseTypes).values({
    organizationId: manager.organization.id,
    name: parsed.data.name,
    isActive: parsed.data.isActive,
  });

  revalidatePath(WAREHOUSE_TYPES_PATH);
  return { ok: true };
}

export async function updateWarehouseType(
  _state: WarehouseTypeFormState,
  formData: FormData,
): Promise<WarehouseTypeFormState> {
  const manager = await requireWarehouseTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe gudang." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0)
    return { error: "Tipe gudang tidak ditemukan." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [existing] = await db
    .select({ id: warehouseTypes.id })
    .from(warehouseTypes)
    .where(
      and(
        eq(warehouseTypes.id, id),
        eq(warehouseTypes.organizationId, manager.organization.id),
        notDeleted(warehouseTypes),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Tipe gudang tidak ditemukan." };

  const [duplicate] = await db
    .select({ id: warehouseTypes.id })
    .from(warehouseTypes)
    .where(
      and(
        eq(warehouseTypes.organizationId, manager.organization.id),
        eq(warehouseTypes.name, parsed.data.name),
        ne(warehouseTypes.id, id),
        notDeleted(warehouseTypes),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "Tipe gudang dengan nama ini sudah ada." } };
  }

  await db
    .update(warehouseTypes)
    .set({ name: parsed.data.name, isActive: parsed.data.isActive })
    .where(
      and(
        eq(warehouseTypes.id, id),
        eq(warehouseTypes.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(WAREHOUSE_TYPES_PATH);
  return { ok: true };
}

export async function deleteWarehouseType(
  formData: FormData,
): Promise<WarehouseTypeFormState> {
  const manager = await requireWarehouseTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe gudang." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0)
    return { error: "Tipe gudang tidak ditemukan." };

  const [existing] = await db
    .select({ id: warehouseTypes.id })
    .from(warehouseTypes)
    .where(
      and(
        eq(warehouseTypes.id, id),
        eq(warehouseTypes.organizationId, manager.organization.id),
        notDeleted(warehouseTypes),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Tipe gudang tidak ditemukan." };

  // Soft delete. Warehouses referencing it keep the row but fall back to no type.
  await db
    .update(warehouseTypes)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(warehouseTypes.id, id),
        eq(warehouseTypes.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(WAREHOUSE_TYPES_PATH);
  return { ok: true };
}
