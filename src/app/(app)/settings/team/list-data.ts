import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { areaOffices, notDeleted, roles, userAreaAssignments, users } from "@/db/schema";
import { isAdmin, type CurrentUser } from "@/lib/auth";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

import type { MemberListRow } from "./types";

const manager = alias(users, "manager");

function teamScope(user: CurrentUser) {
  const organizationId = user.organization.id;
  return and(
    eq(users.organizationId, organizationId),
    notDeleted(users),
    isAdmin(user) ? undefined : sql`${users.id} in (
      with recursive subtree(id) as (
        select ${users.id} from ${users}
        where ${users.id} = ${user.id} and ${users.organizationId} = ${organizationId} and ${notDeleted(users)}
        union
        select ${users.id} from ${users} join subtree on ${users.reportsTo} = subtree.id
        where ${users.organizationId} = ${organizationId} and ${notDeleted(users)}
      )
      select id from subtree
    )`,
  );
}

export async function loadVisibleMemberIds(user: CurrentUser) {
  if (isAdmin(user)) return [];
  return (await db.select({ id: users.id }).from(users).where(teamScope(user))).map(({ id }) => id);
}

export async function loadTeamList(user: CurrentUser, params: Record<string, string | string[] | undefined>, tab?: string, status?: string) {
  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const organizationId = user.organization.id;
  const scope = teamScope(user);
  const filters = and(
    scope,
    tab === "sales" || tab === "back_office" ? eq(users.userType, tab) : undefined,
    status === "active" || status === "inactive" ? eq(users.isActive, status === "active") : undefined,
    tableSearch(q, users.name, users.email, users.code),
  );
  const [counts, [{ total }]] = await Promise.all([
    db.select({ type: users.userType, total: count() }).from(users).where(scope).groupBy(users.userType),
    db.select({ total: count() }).from(users).where(filters),
  ]);
  const pagination = paginateTable(total, page, pageSize);
  const roleName = sql<string | null>`case when ${users.isOrganizationOwner} or ${users.isAdmin} then 'Admin' else ${roles.name} end`;
  const areaNames = sql<string[]>`array(
    select ${areaOffices.name} from ${userAreaAssignments}
    join ${areaOffices} on ${areaOffices.id} = ${userAreaAssignments.areaOfficeId}
    where ${userAreaAssignments.userId} = ${users.id}
      and ${userAreaAssignments.organizationId} = ${organizationId} and ${notDeleted(userAreaAssignments)}
      and ${areaOffices.organizationId} = ${organizationId} and ${notDeleted(areaOffices)}
    order by ${areaOffices.name}
  )`;
  const rows: MemberListRow[] = await db.select({
    id: users.id, name: users.name, email: users.email, code: users.code,
    roleName, isAdmin: users.isAdmin, userType: users.userType,
    reportsToName: manager.name, areaNames, isActive: users.isActive,
    isOrganizationOwner: users.isOrganizationOwner,
  }).from(users)
    .leftJoin(roles, and(eq(users.roleId, roles.id), eq(roles.organizationId, organizationId), notDeleted(roles)))
    .leftJoin(manager, and(eq(users.reportsTo, manager.id), eq(manager.organizationId, organizationId), notDeleted(manager)))
    .where(filters)
    .orderBy(tableOrder({
      name: sql`lower(${users.name})`, code: sql`lower(${users.code})`, type: users.userType,
      role: sql`lower(${roleName})`, reportsTo: sql`lower(${manager.name})`,
      area: sql`nullif(lower(array_to_string(${areaNames}, ', ')), '')`, status: users.isActive,
    }, sort, dir, desc(users.isOrganizationOwner)), asc(users.name), asc(users.id))
    .limit(pageSize).offset(pagination.offset);

  return { rows, pagination, counts: {
    backOffice: counts.find((row) => row.type === "back_office")?.total ?? 0,
    sales: counts.find((row) => row.type === "sales")?.total ?? 0,
  } };
}
