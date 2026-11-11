import { parseAsStringLiteral } from "nuqs/server";

import { tableParsers } from "@/lib/table-query";

export const outletListParsers = {
  ...tableParsers,
  status: parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all"),
  sort: parseAsStringLiteral(["name", "type", "status"] as const).withDefault("name"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
};
