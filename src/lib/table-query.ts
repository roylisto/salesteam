import { createLoader, parseAsInteger, parseAsNumberLiteral, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const PAGE_SIZES = [10, 20, 30, 40, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const tableParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
  sort: parseAsString.withDefault(""),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
};

export const loadTableQuery = createLoader(tableParsers);

export const auditTableParsers = {
  auditQ: tableParsers.q,
  auditPage: tableParsers.page,
  auditPageSize: tableParsers.pageSize,
  auditAction: parseAsString.withDefault(""),
};

export const loadAuditTableQuery = createLoader(auditTableParsers);

export type TablePagination = {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
  offset: number;
};

export function paginateTable(total: number, requestedPage: number, pageSize: PageSize): TablePagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(totalPages, Math.max(1, requestedPage)) : 1;
  return { page, pageSize, total, totalPages, offset: (page - 1) * pageSize };
}
