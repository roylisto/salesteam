import { type SQL, type SQLWrapper, or, sql } from "drizzle-orm";

export function tableSearch(query: string, ...columns: SQLWrapper[]) {
  const needle = query.trim();
  if (!needle) return undefined;
  return or(...columns.map((column) => sql`strpos(lower(${column}), lower(${needle})) > 0`));
}

export function tableOrder(columns: Record<string, SQLWrapper>, sort: string, direction: "asc" | "desc", fallback: SQL) {
  const column = Object.hasOwn(columns, sort) ? columns[sort] : undefined;
  if (!column) return fallback;
  const order = direction === "desc" ? sql`desc` : sql`asc`;
  return sql`${column} ${order} nulls last`;
}
