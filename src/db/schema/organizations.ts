import { isNull } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";

/**
 * A tenant. Every tenant-owned row in the database carries `organization_id`
 * so a single database can safely host many companies (shared-schema multitenancy).
 */
export const organizations = pgTable(
  "organizations",
  {
    id: primaryId(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    legalName: varchar("legal_name", { length: 200 }),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    logoUrl: text("logo_url"),
    currency: varchar("currency", { length: 3 }).default("IDR").notNull(),
    timezone: varchar("timezone", { length: 64 })
      .default("Asia/Jakarta")
      .notNull(),
    province: varchar("province", { length: 120 }),
    city: varchar("city", { length: 120 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("organizations_slug_unique")
      .on(table.slug)
      .where(isNull(table.deletedAt)),
    index("organizations_name_idx").on(table.name),
  ],
);
