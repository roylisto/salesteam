"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { areaOffices, notDeleted, warehouses } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { toFieldErrors } from "@/lib/validation";

export type WarehouseFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const WAREHOUSES_PATH = "/master-data/warehouses";

async function requireWarehouseManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "warehouses")) return null;
  return user;
}

const WarehouseSchema = z.object({
  name: z.string().trim().min(2, "Gunakan minimal 2 karakter.").max(150),
  // Every warehouse belongs to an area; an area can hold many warehouses.
  areaOfficeId: z.coerce
    .number()
    .int()
    .positive("Pilih area untuk gudang ini."),
  depotType: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : null)),
});

function readForm(formData: FormData) {
  return WarehouseSchema.safeParse({
    name: formData.get("name"),
    areaOfficeId: formData.get("areaOfficeId"),
    depotType: formData.get("depotType"),
  });
}

async function areaBelongsToOrg(areaId: number, organizationId: number) {
  const [area] = await db
    .select({ id: areaOffices.id })
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.id, areaId),
        eq(areaOffices.organizationId, organizationId),
        notDeleted(areaOffices),
      ),
    )
    .limit(1);
  return Boolean(area);
}

export async function createWarehouse(
  _state: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  const manager = await requireWarehouseManager();
  if (!manager)
    return { error: "Anda tidak memiliki izin untuk mengelola gudang." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  if (!(await areaBelongsToOrg(parsed.data.areaOfficeId, manager.organization.id))) {
    return { fieldErrors: { areaOfficeId: "Pilih area yang valid." } };
  }

  const [existing] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq(warehouses.organizationId, manager.organization.id),
        eq(warehouses.name, parsed.data.name),
        notDeleted(warehouses),
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "Gudang dengan nama ini sudah ada." } };
  }

  await db.insert(warehouses).values({
    organizationId: manager.organization.id,
    areaOfficeId: parsed.data.areaOfficeId,
    name: parsed.data.name,
    depotType: parsed.data.depotType,
    isActive: formData.get("isActive") !== "false",
  });

  revalidatePath(WAREHOUSES_PATH);
  return { ok: true };
}

export async function updateWarehouse(
  _state: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  const manager = await requireWarehouseManager();
  if (!manager)
    return { error: "Anda tidak memiliki izin untuk mengelola gudang." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Gudang tidak ditemukan." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, id),
        eq(warehouses.organizationId, manager.organization.id),
        notDeleted(warehouses),
      ),
    )
    .limit(1);

  if (!warehouse) return { error: "Gudang tidak ditemukan." };

  if (!(await areaBelongsToOrg(parsed.data.areaOfficeId, manager.organization.id))) {
    return { fieldErrors: { areaOfficeId: "Pilih area yang valid." } };
  }

  const [duplicate] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq(warehouses.organizationId, manager.organization.id),
        eq(warehouses.name, parsed.data.name),
        ne(warehouses.id, id),
        notDeleted(warehouses),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "Gudang dengan nama ini sudah ada." } };
  }

  await db
    .update(warehouses)
    .set({
      areaOfficeId: parsed.data.areaOfficeId,
      name: parsed.data.name,
      depotType: parsed.data.depotType,
      isActive: formData.get("isActive") !== "false",
    })
    .where(
      and(
        eq(warehouses.id, id),
        eq(warehouses.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(WAREHOUSES_PATH);
  return { ok: true };
}

export async function deleteWarehouse(formData: FormData): Promise<WarehouseFormState> {
  const manager = await requireWarehouseManager();
  if (!manager)
    return { error: "Anda tidak memiliki izin untuk mengelola gudang." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Gudang tidak ditemukan." };

  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, id),
        eq(warehouses.organizationId, manager.organization.id),
        notDeleted(warehouses),
      ),
    )
    .limit(1);

  if (!warehouse) return { error: "Gudang tidak ditemukan." };

  // Soft delete: outlets and stock rows keep their references.
  await db
    .update(warehouses)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(warehouses.id, id),
        eq(warehouses.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(WAREHOUSES_PATH);
  return { ok: true };
}
