import {
  bigint,
  index,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { areaOffices } from "./master-data";
import { paymentMethodTypeEnum } from "./enums";

/** Payment method (bank transfer or QRIS) configured per area office. */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    areaOfficeId: bigint("area_office_id", { mode: "number" }).references(
      () => areaOffices.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 150 }).notNull(),
    type: paymentMethodTypeEnum("type").default("qris").notNull(),
    imageUrl: text("image_url"),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    accountNumber: text("account_number"),
    accountName: varchar("account_name", { length: 150 }),
    accountOwner: varchar("account_owner", { length: 150 }),
    ...timestamps,
  },
  (table) => [
    index("payment_methods_organization_idx").on(table.organizationId),
    index("payment_methods_area_office_idx").on(table.areaOfficeId),
  ],
);
