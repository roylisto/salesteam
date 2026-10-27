import { isNull } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";

/**
 * A role is scoped to one organization. `permissions` holds the list of granted
 * module keys (see `src/lib/permissions.ts`). Roles are user-defined; the
 * `admin` slug is reserved for the virtual system Admin (never stored).
 */
export const roles = pgTable(
  "roles",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("roles_organization_slug_unique")
      .on(table.organizationId, table.slug)
      .where(isNull(table.deletedAt)),
    index("roles_organization_idx").on(table.organizationId),
  ],
);

/** A member of an organization. Login is by globally unique email or username. */
export const users = pgTable(
  "users",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: bigint("role_id", { mode: "number" }).references(() => roles.id, {
      onDelete: "set null",
    }),
    reportsTo: bigint("reports_to", { mode: "number" }).references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    code: varchar("code", { length: 50 }),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    /**
     * Optional login handle, stored lowercased. When set the member may sign in
     * with it instead of their email; unique across all tenants (nulls allowed).
     */
    username: varchar("username", { length: 50 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    /**
     * True while the member is still using the system-generated password issued
     * when the account was created — they are forced to pick their own one on
     * first login. Cleared by the change-password flow (and by a completed
     * forgot-password reset).
     */
    mustChangePassword: boolean("must_change_password").default(false).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    isOrganizationOwner: boolean("is_organization_owner")
      .default(false)
      .notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique")
      .on(table.email)
      .where(isNull(table.deletedAt)),
    uniqueIndex("users_username_unique")
      .on(table.username)
      .where(isNull(table.deletedAt)),
    uniqueIndex("users_organization_code_unique")
      .on(table.organizationId, table.code)
      .where(isNull(table.deletedAt)),
    index("users_organization_idx").on(table.organizationId),
    index("users_role_idx").on(table.roleId),
    index("users_reports_to_idx").on(table.reportsTo),
  ],
);

/** Server-side sessions backing the httpOnly session cookie. */
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/**
 * A temporary-password reset request. Step 1 issues a temporary password (stored
 * hashed here) and emails it to the member; step 2 consumes it to set a new
 * password. Rows are retained so the per-month reset limit can be enforced.
 */
export const passwordResetRequests = pgTable(
  "password_reset_requests",
  {
    id: primaryId(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("password_reset_requests_user_idx").on(table.userId),
    index("password_reset_requests_created_at_idx").on(table.createdAt),
  ],
);
