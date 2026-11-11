import "server-only";

import { db, type Database } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditModule = "areas" | "warehouses" | "warehouse_types" | "outlets" |
  "outlet_types" | "team" | "roles" | "organization" | "profile" | "products" |
  "product_brands" | "product_types" | "product_units" | "product_prices" | "warehouse_movements";

type AuditAction = "create" | "update" | "delete" | "login" | "logout" |
  "change_password" | "reset_password" | "reverse";

type AuditActor = { id: number; name: string; organization: { id: number } };
type AuditEntity = { id: number; name?: string | null };
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function recordAudit(
  tx: Transaction,
  actor: AuditActor,
  module: AuditModule,
  action: AuditAction,
  entity: AuditEntity,
) {
  await tx.insert(auditLogs).values({
    organizationId: actor.organization.id,
    actorId: actor.id,
    actorName: actor.name,
    module,
    action,
    entityId: entity.id,
    entityName: entity.name,
  });
}

export async function auditMutation(
  actor: AuditActor,
  module: AuditModule,
  action: AuditAction,
  mutate: (tx: Transaction) => PromiseLike<AuditEntity[]>,
) {
  return db.transaction(async (tx) => {
    const [entity] = await mutate(tx);
    if (entity) await recordAudit(tx, actor, module, action, entity);
    return entity;
  });
}
