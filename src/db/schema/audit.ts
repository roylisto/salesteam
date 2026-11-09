import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";

export const auditLogs = pgTable("audit_logs", {
  id: primaryId(),
  organizationId: bigint("organization_id", { mode: "number" }).notNull()
    .references(() => organizations.id),
  actorId: bigint("actor_id", { mode: "number" }).notNull(),
  actorName: text("actor_name").notNull(),
  module: text("module").notNull(),
  action: text("action").notNull(),
  entityId: bigint("entity_id", { mode: "number" }).notNull(),
  entityName: text("entity_name"),
  ...timestamps,
}, (table) => [
  index("audit_logs_org_module_order_idx").on(table.organizationId, table.module, table.id),
]);
