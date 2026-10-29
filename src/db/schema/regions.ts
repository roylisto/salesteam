import { pgTable, varchar, index } from "drizzle-orm/pg-core";

/**
 * Indonesian administrative regions (Wilayah) based on Kepmendagri.
 * kode: XX (Prov), XX.YY (Regency), XX.YY.ZZ (District), XX.YY.ZZ.WWWW (Village)
 */
export const wilayah = pgTable(
  "wilayah",
  {
    kode: varchar("kode", { length: 13 }).primaryKey(),
    nama: varchar("nama", { length: 100 }).notNull(),
  },
  (table) => [
    index("wilayah_nama_idx").on(table.nama),
  ]
);
