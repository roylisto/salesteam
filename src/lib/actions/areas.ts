"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { areaOffices, notDeleted } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { toFieldErrors } from "@/lib/validation";

export type AreaFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const AREAS_PATH = "/master-data/areas";

async function requireAreaManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "areas")) return null;
  return user;
}

const AreaSchema = z.object({
  name: z.string().trim().min(2).max(150),
});

export async function createArea(
  _state: AreaFormState,
  formData: FormData,
): Promise<AreaFormState> {
  const manager = await requireAreaManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola area." };

  const parsed = AreaSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [existing] = await db
    .select({ id: areaOffices.id })
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.organizationId, manager.organization.id),
        eq(areaOffices.name, parsed.data.name),
        notDeleted(areaOffices),
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "Area dengan nama ini sudah ada." } };
  }

  await db.insert(areaOffices).values({
    organizationId: manager.organization.id,
    name: parsed.data.name,
  });

  revalidatePath(AREAS_PATH);
  return { ok: true };
}

export async function updateArea(
  _state: AreaFormState,
  formData: FormData,
): Promise<AreaFormState> {
  const manager = await requireAreaManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola area." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Area tidak ditemukan." };

  const parsed = AreaSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [area] = await db
    .select()
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.id, id),
        eq(areaOffices.organizationId, manager.organization.id),
        notDeleted(areaOffices),
      ),
    )
    .limit(1);

  if (!area) return { error: "Area tidak ditemukan." };

  const [duplicate] = await db
    .select({ id: areaOffices.id })
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.organizationId, manager.organization.id),
        eq(areaOffices.name, parsed.data.name),
        ne(areaOffices.id, id),
        notDeleted(areaOffices),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "Area dengan nama ini sudah ada." } };
  }

  await db
    .update(areaOffices)
    .set({
      name: parsed.data.name,
    })
    .where(
      and(eq(areaOffices.id, id), eq(areaOffices.organizationId, manager.organization.id)),
    );

  revalidatePath(AREAS_PATH);
  return { ok: true };
}

export async function deleteArea(formData: FormData): Promise<AreaFormState> {
  const manager = await requireAreaManager();
  if (!manager) return { error: "Anda tidak memiliki izin untuk mengelola area." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Area tidak ditemukan." };

  const [area] = await db
    .select()
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.id, id),
        eq(areaOffices.organizationId, manager.organization.id),
        notDeleted(areaOffices),
      ),
    )
    .limit(1);

  if (!area) return { error: "Area tidak ditemukan." };

  // Soft delete: an area may be referenced by assignments and warehouses.
  await db
    .update(areaOffices)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(areaOffices.id, id), eq(areaOffices.organizationId, manager.organization.id)),
    );
  revalidatePath(AREAS_PATH);
  return { ok: true };
}
