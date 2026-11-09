import type { Metadata } from "next";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, roles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableSearch } from "@/lib/table-sql";

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

  const { q, page, pageSize } = loadTableQuery(params);
  const scope = and(eq(roles.organizationId, organization.id), notDeleted(roles));
  const filters = and(scope, tableSearch(q, roles.name, roles.description));
  const [totals] = await db.select({ total: count() }).from(roles).where(filters);
  const pagination = paginateTable(totals.total, page, pageSize);
  const query = () => db.select({
    id: roles.id,
    name: roles.name,
    slug: roles.slug,
    description: roles.description,
    permissions: roles.permissions,
    createdAt: roles.createdAt,
    memberCount: sql<number>`(select count(*)::int from ${users}
      where ${users.roleId} = ${roles.id} and ${users.organizationId} = ${organization.id}
      and ${notDeleted(users)})`,
  }).from(roles);
  const roleRows = await query().where(filters).orderBy(asc(roles.id)).limit(pageSize).offset(pagination.offset);
  const selectedId = typeof params.role === "string" ? Number(params.role) : NaN;
  const selected = roleRows.find((row) => row.id === selectedId) ?? (
    Number.isSafeInteger(selectedId) && selectedId > 0
      ? (await query().where(and(scope, eq(roles.id, selectedId))).limit(1))[0]
      : undefined
  );
  const serialize = (role: (typeof roleRows)[number]): RoleDetail => ({
    ...role,
    createdAt: role.createdAt.toISOString(),
  });
  const roleList = roleRows.map(serialize);

  return (
    <div className="w-full">
      <PageHeader
        title="Peran"
        description="Praset izin yang menentukan modul mana yang dapat diakses oleh anggota."
      />
      <AuditTabs path="/settings/roles" label="Daftar Peran" />
      <RolesClient roles={roleList} pagination={pagination} selectedRow={selected ? serialize(selected) : null} />
    </div>
  );
}
