"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { can, getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { toFieldErrors } from "@/lib/validation";

export type AccountFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const TEAM_PATH = "/settings/team";

async function requireManager() {
  const user = await getCurrentUser();
  if (!user || !can(user, "team")) return null;
  return user;
}

const optionalText = z
  .string()
  .trim()
  .max(50)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const CreateMemberSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
  roleId: z.coerce.number().int().positive(),
  phone: z.string().trim().max(30).optional().transform((v) => (v && v.length > 0 ? v : null)),
  code: optionalText,
});

const UpdateMemberSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  roleId: z.coerce.number().int().positive(),
  phone: z.string().trim().max(30).optional().transform((v) => (v && v.length > 0 ? v : null)),
  code: optionalText,
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const ResetPasswordSchema = z.object({
  id: z.coerce.number().int().positive(),
  password: z.string().min(8),
});

async function assertRoleInOrganization(roleId: number, organizationId: number) {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  return Boolean(role);
}

async function assertCodeAvailable(
  organizationId: number,
  code: string | null,
  excludeUserId?: number,
) {
  if (!code) return true;

  const conditions = [
    eq(users.organizationId, organizationId),
    eq(users.code, code),
  ];
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId));

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return !existing;
}

export async function createMember(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const manager = await requireManager();
  if (!manager) return { error: "You do not have permission to manage the team." };

  const parsed = CreateMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
    phone: formData.get("phone") ?? undefined,
    code: formData.get("code") ?? undefined,
  });

  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { name, email, password, roleId, phone, code } = parsed.data;

  if (!(await assertRoleInOrganization(roleId, manager.organization.id))) {
    return { fieldErrors: { roleId: "Select a role from your organization." } };
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (taken) return { fieldErrors: { email: "This email is already in use." } };

  if (!(await assertCodeAvailable(manager.organization.id, code))) {
    return { fieldErrors: { code: "This staff code is already in use." } };
  }

  await db.insert(users).values({
    organizationId: manager.organization.id,
    roleId,
    name,
    email,
    code,
    phone,
    passwordHash: await hashPassword(password),
  });

  revalidatePath(TEAM_PATH);
  return { ok: true };
}

export async function updateMember(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const manager = await requireManager();
  if (!manager) return { error: "You do not have permission to manage the team." };

  const parsed = UpdateMemberSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    phone: formData.get("phone") ?? undefined,
    code: formData.get("code") ?? undefined,
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { id, name, email, phone, code } = parsed.data;

  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.organizationId, manager.organization.id)))
    .limit(1);

  if (!target) return { error: "Member not found." };

  if (!(await assertRoleInOrganization(parsed.data.roleId, manager.organization.id))) {
    return { fieldErrors: { roleId: "Select a role from your organization." } };
  }

  const [emailTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, id)))
    .limit(1);
  if (emailTaken) return { fieldErrors: { email: "This email is already in use." } };

  if (!(await assertCodeAvailable(manager.organization.id, code, id))) {
    return { fieldErrors: { code: "This staff code is already in use." } };
  }

  // The organization owner keeps full access and cannot be demoted or disabled.
  const protectedMember = target.isOrganizationOwner || target.id === manager.id;

  await db
    .update(users)
    .set({
      name,
      email,
      phone,
      code,
      roleId: protectedMember ? target.roleId : parsed.data.roleId,
      isActive: protectedMember ? true : parsed.data.isActive,
    })
    .where(eq(users.id, id));

  revalidatePath(TEAM_PATH);
  return { ok: true };
}

export async function resetMemberPassword(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const manager = await requireManager();
  if (!manager) return { error: "You do not have permission to manage the team." };

  const parsed = ResetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, parsed.data.id),
        eq(users.organizationId, manager.organization.id),
      ),
    )
    .limit(1);

  if (!target) return { error: "Member not found." };

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(users.id, target.id));

  return { ok: true };
}

export async function deleteMember(
  formData: FormData,
): Promise<AccountFormState> {
  const manager = await requireManager();
  if (!manager) return { error: "You do not have permission to manage the team." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Member not found." };

  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.organizationId, manager.organization.id)))
    .limit(1);

  if (!target) return { error: "Member not found." };
  if (target.isOrganizationOwner || target.id === manager.id) {
    return { error: "The organization owner cannot be removed." };
  }

  await db.delete(users).where(eq(users.id, id));
  revalidatePath(TEAM_PATH);
  return { ok: true };
}
