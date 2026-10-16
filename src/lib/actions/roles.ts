"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import {
  ADMIN_ONLY_PERMISSIONS,
  isPermissionKey,
  OWNER_ROLE_SLUG,
} from "@/lib/permissions";
import { toFieldErrors } from "@/lib/validation";

export type RoleFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const ROLES_PATH = "/settings/roles";

async function requireRoleManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "roles")) return null;
  return user;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function readPermissions(formData: FormData): string[] {
  return formData
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string")
    .filter(isPermissionKey)
    .filter((key) => !ADMIN_ONLY_PERMISSIONS.includes(key));
}

const RoleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export async function createRole(
  _state: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const manager = await requireRoleManager();
  if (!manager) return { error: "You do not have permission to manage roles." };

  const parsed = RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const permissions = readPermissions(formData);
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: "Select at least one module." } };
  }

  const slug = slugify(parsed.data.name);
  if (slug.length === 0) {
    return { fieldErrors: { name: "Enter a name with letters or numbers." } };
  }
  if (slug === OWNER_ROLE_SLUG) {
    return { fieldErrors: { name: "This name is reserved for the system Admin." } };
  }

  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, manager.organization.id),
        eq(roles.slug, slug),
      ),
    )
    .limit(1);

  if (existing) {
    return { fieldErrors: { name: "A role with this name already exists." } };
  }

  await db.insert(roles).values({
    organizationId: manager.organization.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    permissions,
  });

  revalidatePath(ROLES_PATH);
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function updateRole(
  _state: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const manager = await requireRoleManager();
  if (!manager) return { error: "You do not have permission to manage roles." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Role not found." };

  const parsed = RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.organizationId, manager.organization.id)))
    .limit(1);

  if (!role) return { error: "Role not found." };

  const permissions = readPermissions(formData);
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: "Select at least one module." } };
  }

  const slug = slugify(parsed.data.name);
  if (slug === OWNER_ROLE_SLUG) {
    return { fieldErrors: { name: "This name is reserved for the system Admin." } };
  }

  const [duplicate] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, manager.organization.id),
        eq(roles.slug, slug),
        ne(roles.id, id),
      ),
    )
    .limit(1);

  if (duplicate) {
    return { fieldErrors: { name: "A role with this name already exists." } };
  }

  await db
    .update(roles)
    .set({
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      permissions,
    })
    .where(eq(roles.id, id));

  revalidatePath(ROLES_PATH);
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function deleteRole(formData: FormData): Promise<RoleFormState> {
  const manager = await requireRoleManager();
  if (!manager) return { error: "You do not have permission to manage roles." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Role not found." };

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.organizationId, manager.organization.id)))
    .limit(1);

  if (!role) return { error: "Role not found." };

  const [assigned] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.roleId, id))
    .limit(1);

  if (assigned) {
    return { error: "Reassign the team members using this role first." };
  }

  await db.delete(roles).where(eq(roles.id, id));
  revalidatePath(ROLES_PATH);
  return { ok: true };
}
