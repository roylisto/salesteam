import { bigint, timestamp } from "drizzle-orm/pg-core";

/**
 * Auto-incrementing bigint primary key.
 *
 * Uses `bigint GENERATED ALWAYS AS IDENTITY` instead of `int`/`serial` so a table
 * can grow into the billions of rows without an expensive primary key rewrite.
 * An int PK would overflow at ~2.1B rows.
 */
export const primaryId = () =>
  bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();

/**
 * Standard created/updated bookkeeping columns, stored with timezone.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};
