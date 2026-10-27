"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { notDeleted, outletTypes } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
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
  name: z.string().trim().min(2, "Use at least 2 characters.").max(150),
  isActive: z.boolean(),
});

function readForm(formData: FormData) {
  return OutletTypeSchema.safeParse({
    name: formData.get("name"),
    isActive: formData.get("isActive") === "true",
  });
}

export async function createOutletType(
  _state: OutletTypeFormState,
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "You do not have permission to manage outlet types." };
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
    return { fieldErrors: { name: "An outlet type with this name already exists." } };
  }

  await db.insert(outletTypes).values({
    organizationId: manager.organization.id,
    name: parsed.data.name,
    isActive: parsed.data.isActive,
  });

  revalidatePath(OUTLET_TYPES_PATH);
  return { ok: true };
}

export async function updateOutletType(
  _state: OutletTypeFormState,
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "You do not have permission to manage outlet types." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Outlet type not found." };

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

  if (!existing) return { error: "Outlet type not found." };

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
    return { fieldErrors: { name: "An outlet type with this name already exists." } };
  }

  await db
    .update(outletTypes)
    .set({ name: parsed.data.name, isActive: parsed.data.isActive })
    .where(
      and(
        eq(outletTypes.id, id),
        eq(outletTypes.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(OUTLET_TYPES_PATH);
  return { ok: true };
}

export async function deleteOutletType(
  formData: FormData,
): Promise<OutletTypeFormState> {
  const manager = await requireOutletTypeManager();
  if (!manager) {
    return { error: "You do not have permission to manage outlet types." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Outlet type not found." };

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

  if (!existing) return { error: "Outlet type not found." };

  // Soft delete. Outlets referencing it keep the row but fall back to no type.
  await db
    .update(outletTypes)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(outletTypes.id, id),
        eq(outletTypes.organizationId, manager.organization.id),
      ),
    );

  revalidatePath(OUTLET_TYPES_PATH);
  return { ok: true };
}
