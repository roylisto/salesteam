import { parseAsString, parseAsStringLiteral } from "nuqs/server";

import { tableParsers } from "@/lib/table-query";
export const ALL_WAREHOUSES = "all";
export const NO_WAREHOUSE = "none";

export const outletListParsers = {
  ...tableParsers,
  warehouse: parseAsString.withDefault(ALL_WAREHOUSES),
  status: parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all"),
  sort: parseAsStringLiteral(["name", "type", "warehouse", "status"] as const).withDefault("name"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
};
