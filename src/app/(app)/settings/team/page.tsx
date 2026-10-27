import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import {
  areaOffices,
  notDeleted,
  roles,
  userAreaAssignments,
  userWarehouseAssignments,
  users,
  warehouses,
} from "@/db/schema";
import { isAdmin, requirePermission } from "@/lib/auth";

import { TeamClient } from "./team-client";
import type {
  AreaOption,
  MemberRow,
  RoleOption,
  WarehouseOption,
} from "./types";

export const metadata: Metadata = { title: "Tim" };

function collectSubtreeIds(
  rows: { id: number; reportsTo: number | null }[],
  rootId: number,
): Set<number> {
  const byParent = new Map<number, number[]>();
  for (const row of rows) {
    if (row.reportsTo === null) continue;
    const list = byParent.get(row.reportsTo) ?? [];
    list.push(row.id);
    byParent.set(row.reportsTo, list);
  }
  const seen = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.pop() as number;
    for (const child of byParent.get(current) ?? []) {
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }
  return seen;
}

export default async function TeamPage() {
  const user = await requirePermission("team");
  const { organization } = user;
  const actorIsAdmin = isAdmin(user);

  const [roleRows, memberRows, areaRows, assignmentRows, warehouseRows, warehouseAssignmentRows] =
    await Promise.all([
      db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(and(eq(roles.organizationId, organization.id), notDeleted(roles)))
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
          isAdmin: users.isAdmin,
          reportsTo: users.reportsTo,
          isActive: users.isActive,
          isOrganizationOwner: users.isOrganizationOwner,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, and(eq(users.roleId, roles.id), notDeleted(roles)))
        .where(and(eq(users.organizationId, organization.id), notDeleted(users)))
        .orderBy(desc(users.isOrganizationOwner), asc(users.name)),
      db
        .select({ id: areaOffices.id, name: areaOffices.name })
        .from(areaOffices)
        .where(
          and(eq(areaOffices.organizationId, organization.id), notDeleted(areaOffices)),
        )
        .orderBy(asc(areaOffices.name)),
      db
        .select({
          userId: userAreaAssignments.userId,
          areaOfficeId: userAreaAssignments.areaOfficeId,
          areaName: areaOffices.name,
        })
        .from(userAreaAssignments)
        .innerJoin(
          areaOffices,
          and(
            eq(userAreaAssignments.areaOfficeId, areaOffices.id),
            notDeleted(areaOffices),
          ),
        )
        .where(
          and(
            eq(userAreaAssignments.organizationId, organization.id),
            notDeleted(userAreaAssignments),
          ),
        ),
      // Only warehouses with an area can be assigned (an area is chosen first).
      db
        .select({
          id: warehouses.id,
          name: warehouses.name,
          areaOfficeId: warehouses.areaOfficeId,
        })
        .from(warehouses)
        .where(
          and(eq(warehouses.organizationId, organization.id), notDeleted(warehouses)),
        )
        .orderBy(asc(warehouses.name)),
      db
        .select({
          userId: userWarehouseAssignments.userId,
          warehouseId: userWarehouseAssignments.warehouseId,
        })
        .from(userWarehouseAssignments)
        .innerJoin(
          warehouses,
          and(
            eq(userWarehouseAssignments.warehouseId, warehouses.id),
            notDeleted(warehouses),
          ),
        )
        .where(
          and(
            eq(userWarehouseAssignments.organizationId, organization.id),
            notDeleted(userWarehouseAssignments),
          ),
        ),
    ]);

  const roleOptions: RoleOption[] = roleRows;
  const areaOptions: AreaOption[] = areaRows;
  const warehouseOptions: WarehouseOption[] = warehouseRows
    .filter((row) => row.areaOfficeId !== null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      areaOfficeId: row.areaOfficeId as number,
    }));

  const areaByUser = new Map<number, { ids: number[]; names: string[] }>();
  for (const row of assignmentRows) {
    const entry = areaByUser.get(row.userId) ?? { ids: [], names: [] };
    entry.ids.push(row.areaOfficeId);
    entry.names.push(row.areaName);
    areaByUser.set(row.userId, entry);
  }

  const warehouseByUser = new Map<number, number[]>();
  for (const row of warehouseAssignmentRows) {
    const list = warehouseByUser.get(row.userId) ?? [];
    list.push(row.warehouseId);
    warehouseByUser.set(row.userId, list);
  }

  const nameById = new Map(memberRows.map((member) => [member.id, member.name]));

  const allMembers: MemberRow[] = memberRows.map((member) => {
    const areas = areaByUser.get(member.id) ?? { ids: [], names: [] };
    return {
      ...member,
      roleName:
        member.isOrganizationOwner || member.isAdmin
          ? "Admin"
          : (member.roleName ?? null),
      reportsToName: member.reportsTo ? (nameById.get(member.reportsTo) ?? null) : null,
      areaIds: areas.ids,
      areaNames: areas.names,
      warehouseIds: warehouseByUser.get(member.id) ?? [],
      lastLoginAt: member.lastLoginAt ? member.lastLoginAt.toISOString() : null,
      createdAt: member.createdAt.toISOString(),
    };
  });

  // Non-admins only see their own subtree (self + everyone reporting down).
  let visibleMembers = allMembers;
  if (!actorIsAdmin) {
    const subtree = collectSubtreeIds(
      memberRows.map((row) => ({ id: row.id, reportsTo: row.reportsTo })),
      user.id,
    );
    visibleMembers = allMembers.filter((member) => subtree.has(member.id));
  }

  // Areas a non-admin may hand down: their own areas only.
  const actorAreas = actorIsAdmin
    ? areaOptions
    : (() => {
        const ids = new Set(areaByUser.get(user.id)?.ids ?? []);
        return areaOptions.filter((area) => ids.has(area.id));
      })();

  return (
    <div className="w-full">
      <PageHeader
        title="Tim"
        description="Kelola garis atasan, area, dan akses untuk organisasi ini."
      />
      <TeamClient
        members={visibleMembers}
        roles={roleOptions}
        areas={areaOptions}
        warehouses={warehouseOptions}
        assignableAreas={actorAreas}
        currentUserId={user.id}
        isAdmin={actorIsAdmin}
      />
    </div>
  );
}
