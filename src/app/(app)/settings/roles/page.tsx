import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { RolesClient } from "./roles-client";
import type { RoleDetail } from "./types";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const user = await requirePermission("roles");
  const { organization } = user;

  const [roleRows, memberCounts] = await Promise.all([
    db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        permissions: roles.permissions,
        createdAt: roles.createdAt,
      })
      .from(roles)
      .where(eq(roles.organizationId, organization.id))
      .orderBy(asc(roles.id)),
    db
      .select({ roleId: users.roleId, value: count() })
      .from(users)
      .where(eq(users.organizationId, organization.id))
      .groupBy(users.roleId),
  ]);

  const countByRole = new Map<number, number>();
  for (const row of memberCounts) {
    if (row.roleId !== null) countByRole.set(row.roleId, row.value);
  }

  const roleList: RoleDetail[] = roleRows.map((role) => ({
    ...role,
    memberCount: countByRole.get(role.id) ?? 0,
    createdAt: role.createdAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Roles"
        description="Permission presets that decide which modules a member can access."
      />
      <RolesClient roles={roleList} />
    </div>
  );
}
