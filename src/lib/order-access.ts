import "server-only";
import { sql, type SQLWrapper } from "drizzle-orm";
import { isAdmin, type CurrentUser } from "@/lib/auth";

/** Re-evaluated in every query/mutation; never trust client salesperson choices. */
export function orderSalesScope(user: CurrentUser, column: SQLWrapper) {
  if (user.userType === "sales") return sql`${column} = ${user.id}`;
  if (isAdmin(user)) return undefined;
  return sql`${column} in (
    with recursive team(id) as (
      select id from users where id = ${user.id} and organization_id = ${user.organization.id} and deleted_at is null
      union
      select child.id from users child join team parent on child.reports_to = parent.id
      where child.organization_id = ${user.organization.id} and child.deleted_at is null
    ) select id from team
  )`;
}
