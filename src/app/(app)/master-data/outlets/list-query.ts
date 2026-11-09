import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const OUTLET_PAGE_SIZE = 10;
export const ALL_WAREHOUSES = "all";
export const NO_WAREHOUSE = "none";

export const outletListParsers = {
  q: parseAsString.withDefault(""),
  warehouse: parseAsString.withDefault(ALL_WAREHOUSES),
  status: parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(["name", "type", "warehouse", "status"] as const).withDefault("name"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
};
