import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { TeamClient } from "./team-client";
import type { MemberRow, RoleOption } from "./types";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requirePermission("team");
  const { organization } = user;

  const [roleRows, memberRows] = await Promise.all([
    db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.organizationId, organization.id))
      .orderBy(asc(roles.name)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        code: users.code,
        phone: users.phone,
        roleId: users.roleId,
        roleName: roles.name,
        isActive: users.isActive,
        isOrganizationOwner: users.isOrganizationOwner,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.organizationId, organization.id))
      .orderBy(desc(users.isOrganizationOwner), asc(users.name)),
  ]);

  const roleOptions: RoleOption[] = roleRows;

  const members: MemberRow[] = memberRows.map((member) => ({
    ...member,
    lastLoginAt: member.lastLoginAt ? member.lastLoginAt.toISOString() : null,
    createdAt: member.createdAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Team"
        description="Manage the people who can access this organization."
      />
      <TeamClient
        members={members}
        roles={roleOptions}
        currentUserId={user.id}
      />
    </div>
  );
}
