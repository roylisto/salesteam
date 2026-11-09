import type { Metadata } from "next";
import { and, asc, count, eq } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, roles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { RolesClient } from "./roles-client";
import type { RoleDetail } from "./types";

export const metadata: Metadata = { title: "Peran" };

export default async function RolesPage({ searchParams }: PageProps<"/settings/roles">) {
  const user = await requirePermission("roles");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="roles" path="/settings/roles" title="Peran" label="Daftar Peran" params={params} />;
  }
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
      .where(and(eq(roles.organizationId, organization.id), notDeleted(roles)))
      .orderBy(asc(roles.id)),
    db
      .select({ roleId: users.roleId, value: count() })
      .from(users)
      .where(and(eq(users.organizationId, organization.id), notDeleted(users)))
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
        title="Peran"
        description="Praset izin yang menentukan modul mana yang dapat diakses oleh anggota."
      />
      <AuditTabs path="/settings/roles" label="Daftar Peran" />
      <RolesClient roles={roleList} />
    </div>
  );
}
