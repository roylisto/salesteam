"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { areaOffices, notDeleted, users, warehouses } from "@/db/schema";
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
  picUserId: z.coerce
    .number()
    .int()
    .positive("Pilih PIC penanggung jawab.")
    .optional()
    .nullable()
    .transform((value) => (value && value > 0 ? value : null)),
  depotType: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : null)),
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
  province: z.string().trim().min(1, "Provinsi wajib dipilih.").max(120),
  regency: z.string().trim().min(1, "Kabupaten/kota wajib dipilih.").max(120),
  district: z.string().trim().min(1, "Kecamatan wajib dipilih.").max(120),
  village: z.string().trim().min(1, "Kelurahan/desa wajib dipilih.").max(120),
  postalCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value : null)),
  latitude: z
    .string()
    .trim()
    .min(1, "Latitude wajib diisi.")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= -90 && value <= 90, {
      message: "Latitude tidak valid.",
    }),
  longitude: z
    .string()
    .trim()
    .min(1, "Longitude wajib diisi.")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value >= -180 && value <= 180, {
      message: "Longitude tidak valid.",
    }),
});

function readForm(formData: FormData) {
  return WarehouseSchema.safeParse({
    name: formData.get("name"),
    areaOfficeId: formData.get("areaOfficeId"),
    picUserId: formData.get("picUserId"),
    depotType: formData.get("depotType"),
    address: formData.get("address"),
    province: formData.get("province") ?? "",
    regency: formData.get("regency") ?? "",
    district: formData.get("district") ?? "",
    village: formData.get("village") ?? "",
    postalCode: formData.get("postalCode"),
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
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

  if (parsed.data.picUserId) {
    const [picUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, parsed.data.picUserId),
          eq(users.organizationId, manager.organization.id),
          eq(users.userType, "back_office"),
          notDeleted(users),
        ),
      )
      .limit(1);
    if (!picUser) {
      return { fieldErrors: { picUserId: "Pilih PIC Back Office yang valid." } };
    }
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
    picUserId: parsed.data.picUserId,
    name: parsed.data.name,
    depotType: parsed.data.depotType,
    address: parsed.data.address,
    province: parsed.data.province,
    regency: parsed.data.regency,
    district: parsed.data.district,
    village: parsed.data.village,
    postalCode: parsed.data.postalCode,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
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

  if (parsed.data.picUserId) {
    const [picUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, parsed.data.picUserId),
          eq(users.organizationId, manager.organization.id),
          eq(users.userType, "back_office"),
          notDeleted(users),
        ),
      )
      .limit(1);
    if (!picUser) {
      return { fieldErrors: { picUserId: "Pilih PIC Back Office yang valid." } };
    }
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
      picUserId: parsed.data.picUserId,
      name: parsed.data.name,
      depotType: parsed.data.depotType,
      address: parsed.data.address,
      province: parsed.data.province,
      regency: parsed.data.regency,
      district: parsed.data.district,
      village: parsed.data.village,
      postalCode: parsed.data.postalCode,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
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
