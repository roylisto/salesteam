"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { areaOffices } from "@/db/schema";
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
  if (!manager) return { error: "You do not have permission to manage areas." };

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
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "An area with this name already exists." } };
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
  if (!manager) return { error: "You do not have permission to manage areas." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Area not found." };

  const parsed = AreaSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [area] = await db
    .select()
    .from(areaOffices)
    .where(
      and(eq(areaOffices.id, id), eq(areaOffices.organizationId, manager.organization.id)),
    )
    .limit(1);

  if (!area) return { error: "Area not found." };

  const [duplicate] = await db
    .select({ id: areaOffices.id })
    .from(areaOffices)
    .where(
      and(
        eq(areaOffices.organizationId, manager.organization.id),
        eq(areaOffices.name, parsed.data.name),
        ne(areaOffices.id, id),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "An area with this name already exists." } };
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
  if (!manager) return { error: "You do not have permission to manage areas." };

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Area not found." };

  const [area] = await db
    .select()
    .from(areaOffices)
    .where(
      and(eq(areaOffices.id, id), eq(areaOffices.organizationId, manager.organization.id)),
    )
    .limit(1);

  if (!area) return { error: "Area not found." };

  await db
    .delete(areaOffices)
    .where(
      and(eq(areaOffices.id, id), eq(areaOffices.organizationId, manager.organization.id)),
    );
  revalidatePath(AREAS_PATH);
  return { ok: true };
}
