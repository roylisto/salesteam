"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  notDeleted,
  outletTypes,
  outlets,
  users,
  warehouses,
} from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { deleteFromS3, uploadToS3 } from "@/lib/storage";
import { toFieldErrors } from "@/lib/validation";

export type OutletFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const OUTLETS_PATH = "/master-data/outlets";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function requireOutletManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "outlets")) return null;
  return user;
}

/** FormData entries arrive as string | File | null; treat anything non-string as "". */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? value : null));

const optionalId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .transform((value) => (typeof value === "number" ? value : null));

const optionalCoordinate = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : null))
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= min && value <= max),
      { message: `Masukkan ${label} yang valid (${min} hingga ${max}).` },
    );

const optionalEmail = z
  .string()
  .trim()
  .max(150)
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Masukkan alamat email yang valid.",
  });

const OutletSchema = z.object({
  name: z.string().trim().min(2, "Gunakan minimal 2 karakter.").max(200),
  code: optionalText(80),
  status: z.enum(["active", "inactive"]),
  // Optional assignments; a rep / type / warehouse can be pinned later.
  warehouseId: optionalId,
  salesId: optionalId,
  outletTypeId: optionalId,
  ownerName: optionalText(150),
  ownerAddress: optionalText(2000),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(2000),
  addressDetail: optionalText(2000),
  country: optionalText(100),
  province: optionalText(120),
  city: optionalText(120),
  district: optionalText(120),
  village: optionalText(120),
  postalCode: optionalText(20),
  nationalId: optionalText(50),
  taxId: optionalText(50),
  familyCardNumber: optionalText(50),
  businessId: optionalText(50),
  notes: optionalText(2000),
  latitude: optionalCoordinate(-90, 90, "lintang"),
  longitude: optionalCoordinate(-180, 180, "bujur"),
});

type OutletInput = z.infer<typeof OutletSchema>;

function readForm(formData: FormData) {
  return OutletSchema.safeParse({
    name: text(formData.get("name")),
    code: text(formData.get("code")),
    status: text(formData.get("status")),
    warehouseId: text(formData.get("warehouseId")),
    salesId: text(formData.get("salesId")),
    outletTypeId: text(formData.get("outletTypeId")),
    ownerName: text(formData.get("ownerName")),
    ownerAddress: text(formData.get("ownerAddress")),
    phone: text(formData.get("phone")),
    email: text(formData.get("email")),
    address: text(formData.get("address")),
    addressDetail: text(formData.get("addressDetail")),
    country: text(formData.get("country")),
    province: text(formData.get("province")),
    city: text(formData.get("city")),
    district: text(formData.get("district")),
    village: text(formData.get("village")),
    postalCode: text(formData.get("postalCode")),
    nationalId: text(formData.get("nationalId")),
    taxId: text(formData.get("taxId")),
    familyCardNumber: text(formData.get("familyCardNumber")),
    businessId: text(formData.get("businessId")),
    notes: text(formData.get("notes")),
    latitude: text(formData.get("latitude")),
    longitude: text(formData.get("longitude")),
  });
}

async function idBelongsToOrg(
  table: typeof warehouses | typeof users | typeof outletTypes,
  id: number,
  organizationId: number,
) {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.id, id),
        eq(table.organizationId, organizationId),
        notDeleted(table),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function validateReferences(
  data: OutletInput,
  organizationId: number,
): Promise<Record<string, string> | null> {
  if (
    data.warehouseId &&
    !(await idBelongsToOrg(warehouses, data.warehouseId, organizationId))
  ) {
    return { warehouseId: "Pilih gudang yang valid." };
  }
  if (data.salesId && !(await idBelongsToOrg(users, data.salesId, organizationId))) {
    return { salesId: "Pilih sales yang valid." };
  }
  if (
    data.outletTypeId &&
    !(await idBelongsToOrg(outletTypes, data.outletTypeId, organizationId))
  ) {
    return { outletTypeId: "Pilih tipe outlet yang valid." };
  }
  return null;
}

async function codeTaken(
  organizationId: number,
  code: string,
  excludeId?: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(
      and(
        eq(outlets.organizationId, organizationId),
        eq(outlets.code, code),
        excludeId ? ne(outlets.id, excludeId) : undefined,
        notDeleted(outlets),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100);
}

/** Bare keys are returned as-is; legacy full URLs are trimmed to the key. */
function resolveStoredKey(stored: string | null): string | null {
  if (!stored) return null;
  if (!stored.includes("://")) return stored;
  const marker = `organizations/`;
  const index = stored.indexOf(marker);
  return index === -1 ? null : stored.slice(index);
}

type ImageOutcome =
  | { error: string }
  | { imageUrl: string | null; replacedKey: string | null };

/**
 * Uploads/replaces/clears the outlet photo. Keys live under the organization's
 * folder so the authenticated `/api/files` route can serve them.
 */
async function resolveImage(
  formData: FormData,
  organizationId: number,
  current: string | null,
): Promise<ImageOutcome> {
  const image = formData.get("image");
  const removeImage = formData.get("removeImage") === "true";

  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      return { error: "Foto harus berformat PNG, JPG, atau WEBP." };
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return { error: "Ukuran foto maksimal 2 MB." };
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    const key = `organizations/${organizationId}/outlets/${Date.now()}-${sanitizeFilename(image.name || "outlet")}`;
    await uploadToS3(key, bytes, image.type);

    return { imageUrl: key, replacedKey: resolveStoredKey(current) };
  }

  if (removeImage && current) {
    return { imageUrl: null, replacedKey: resolveStoredKey(current) };
  }

  return { imageUrl: current, replacedKey: null };
}

export async function createOutlet(
  _state: OutletFormState,
  formData: FormData,
): Promise<OutletFormState> {
  const manager = await requireOutletManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola outlet." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const data = parsed.data;
  const orgId = manager.organization.id;

  const referenceError = await validateReferences(data, orgId);
  if (referenceError) return { fieldErrors: referenceError };
  if (data.code && (await codeTaken(orgId, data.code))) {
    return { fieldErrors: { code: "Kode outlet ini sudah digunakan." } };
  }

  const image = await resolveImage(formData, orgId, null);
  if ("error" in image) return { fieldErrors: { image: image.error } };

  await db.insert(outlets).values({
    organizationId: orgId,
    ...data,
    imageUrl: image.imageUrl,
  });

  revalidatePath(OUTLETS_PATH);
  return { ok: true };
}

export async function updateOutlet(
  _state: OutletFormState,
  formData: FormData,
): Promise<OutletFormState> {
  const manager = await requireOutletManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola outlet." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Outlet tidak ditemukan." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const data = parsed.data;
  const orgId = manager.organization.id;

  const [existing] = await db
    .select({ id: outlets.id, imageUrl: outlets.imageUrl })
    .from(outlets)
    .where(and(eq(outlets.id, id), eq(outlets.organizationId, orgId), notDeleted(outlets)))
    .limit(1);
  if (!existing) return { error: "Outlet tidak ditemukan." };

  const referenceError = await validateReferences(data, orgId);
  if (referenceError) return { fieldErrors: referenceError };
  if (data.code && (await codeTaken(orgId, data.code, id))) {
    return { fieldErrors: { code: "Kode outlet ini sudah digunakan." } };
  }

  const image = await resolveImage(formData, orgId, existing.imageUrl);
  if ("error" in image) return { fieldErrors: { image: image.error } };

  await db
    .update(outlets)
    .set({ ...data, imageUrl: image.imageUrl })
    .where(and(eq(outlets.id, id), eq(outlets.organizationId, orgId)));

  if (image.replacedKey) {
    await deleteFromS3(image.replacedKey).catch(() => undefined);
  }

  revalidatePath(OUTLETS_PATH);
  revalidatePath(`${OUTLETS_PATH}/${id}`);
  return { ok: true };
}

export async function deleteOutlet(formData: FormData): Promise<OutletFormState> {
  const manager = await requireOutletManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola outlet." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Outlet tidak ditemukan." };

  const [existing] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(
      and(
        eq(outlets.id, id),
        eq(outlets.organizationId, manager.organization.id),
        notDeleted(outlets),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Outlet tidak ditemukan." };

  // Soft delete: visits and orders keep their historical references.
  await db
    .update(outlets)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(outlets.id, id),
        eq(outlets.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(OUTLETS_PATH);
  return { ok: true };
}
