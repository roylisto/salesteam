"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { auditMutation } from "@/lib/audit";
import { notDeleted, outletTypes } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { OUTLET_ICON_KEYS } from "@/lib/outlet-appearance";
import { toFieldErrors } from "@/lib/validation";

export type OutletTypeFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const OUTLET_TYPES_PATH = "/master-data/outlet-types";

async function requireOutletTypeManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "outlet_types")) return null;
  return user;
}

const OutletTypeSchema = z.object({
  name: z.string().trim().min(2, "Gunakan minimal 2 karakter.").max(150),
  isActive: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pilih warna yang valid.").transform((value) => value.toLowerCase()),
  icon: z.enum(OUTLET_ICON_KEYS, { error: "Pilih ikon outlet yang tersedia." }),
});

function readForm(formData: FormData) {
  return OutletTypeSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    isActive: formData.get("isActive") === "true",
  });
}

export async function createOutletType(
  _state: OutletTypeFormState,
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe outlet." };
  }

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [existing] = await db
    .select({ id: outletTypes.id })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.organizationId, manager.organization.id),
        eq(outletTypes.name, parsed.data.name),
        notDeleted(outletTypes),
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "Tipe outlet dengan nama ini sudah ada." } };
  }

  await auditMutation(manager, "outlet_types", "create", (tx) =>
    tx.insert(outletTypes).values({
      organizationId: manager.organization.id,
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
      isActive: parsed.data.isActive,
    })
      .returning({ id: outletTypes.id, name: outletTypes.name }),
  );

  revalidatePath(OUTLET_TYPES_PATH);
  revalidatePath("/master-data/outlets");
  return { ok: true };
}

export async function updateOutletType(
  _state: OutletTypeFormState,
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe outlet." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Tipe outlet tidak ditemukan." };

  const parsed = readForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [existing] = await db
    .select({ id: outletTypes.id })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.id, id),
        eq(outletTypes.organizationId, manager.organization.id),
        notDeleted(outletTypes),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Tipe outlet tidak ditemukan." };

  const [duplicate] = await db
    .select({ id: outletTypes.id })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.organizationId, manager.organization.id),
        eq(outletTypes.name, parsed.data.name),
        ne(outletTypes.id, id),
        notDeleted(outletTypes),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "Tipe outlet dengan nama ini sudah ada." } };
  }

  const saved = await auditMutation(manager, "outlet_types", "update", (tx) =>
    tx
      .update(outletTypes)
      .set(parsed.data)
      .where(and(eq(outletTypes.id, id), eq(outletTypes.organizationId, manager.organization.id), notDeleted(outletTypes)))
      .returning({ id: outletTypes.id, name: outletTypes.name }),
  );
  if (!saved) return { error: "Tipe outlet tidak ditemukan." };

  revalidatePath(OUTLET_TYPES_PATH);
  revalidatePath("/master-data/outlets");
  return { ok: true };
}

export async function deleteOutletType(
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "Anda tidak memiliki izin untuk mengelola tipe outlet." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Tipe outlet tidak ditemukan." };

  const [existing] = await db
    .select({ id: outletTypes.id })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.id, id),
        eq(outletTypes.organizationId, manager.organization.id),
        notDeleted(outletTypes),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Tipe outlet tidak ditemukan." };

  // Soft delete. Outlets referencing it keep the row but fall back to no type.
  const saved = await auditMutation(manager, "outlet_types", "delete", (tx) =>
    tx
      .update(outletTypes)
      .set({ deletedAt: new Date() })
      .where(and(eq(outletTypes.id, id), eq(outletTypes.organizationId, manager.organization.id), notDeleted(outletTypes)))
      .returning({ id: outletTypes.id, name: outletTypes.name }),
  );
  if (!saved) return { error: "Tipe outlet tidak ditemukan." };

  revalidatePath(OUTLET_TYPES_PATH);
  revalidatePath("/master-data/outlets");
  return { ok: true };
}
