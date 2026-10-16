import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { ADMIN_ONLY_PERMISSIONS, isPermissionKey, OWNER_ROLE_SLUG, PERMISSION_KEYS, type PermissionKey } from "./permissions";
import { loadSessionContext } from "./session";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  code: string | null;
  avatarUrl: string | null;
  isOrganizationOwner: boolean;
  organization: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    currency: string;
    timezone: string;
  };
  role: {
    id: number;
    name: string;
    slug: string;
  } | null;
  permissions: PermissionKey[];
};

/** True when the member is an organization admin (owner or Admin role). */
export function isAdmin(
  user: Pick<CurrentUser, "isOrganizationOwner" | "role">,
): boolean {
  return (
    user.isOrganizationOwner || user.role?.slug === OWNER_ROLE_SLUG
  );
}

/**
 * Data Access Layer entry point. Memoized per render pass, so calling it from
 * several components costs a single query.
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const context = await loadSessionContext();
    if (!context) return null;

    // Admins always get every permission, even as new modules are added.
    // Admin-only modules (organization settings, roles) are stripped from
    // everyone else, even if an old role row still lists them.
    const isOwnerOrAdmin =
      context.user.isOrganizationOwner ||
      context.role?.slug === OWNER_ROLE_SLUG;
    const granted = isOwnerOrAdmin
      ? PERMISSION_KEYS
      : ((context.role?.permissions ?? []) as string[])
          .filter(isPermissionKey)
          .filter(
            (key) => !ADMIN_ONLY_PERMISSIONS.includes(key),
          );

    return {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      code: context.user.code,
      avatarUrl: context.user.avatarUrl,
      isOrganizationOwner: context.user.isOrganizationOwner,
      organization: {
        id: context.organization.id,
        name: context.organization.name,
        slug: context.organization.slug,
        logoUrl: context.organization.logoUrl,
        currency: context.organization.currency,
        timezone: context.organization.timezone,
      },
      role: context.role
        ? {
            id: context.role.id,
            name: context.role.name,
            slug: context.role.slug,
          }
        : null,
      permissions: granted,
    };
  },
);

/** Returns the signed-in member or redirects to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function can(
  user: Pick<CurrentUser, "permissions">,
  permission: PermissionKey,
): boolean {
  return user.permissions.includes(permission);
}

export function canAny(
  user: Pick<CurrentUser, "permissions">,
  permissions: PermissionKey[],
): boolean {
  return permissions.some((permission) => user.permissions.includes(permission));
}

/** Returns the signed-in admin or redirects to the dashboard when forbidden. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

/** Returns the signed-in member or redirects to the dashboard when forbidden. */
export async function requirePermission(
  permission: PermissionKey,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/dashboard");
  return user;
}
