
"use server";

import { and, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { wilayah } from "@/db/schema/regions";

export type WilayahOption = {
  kode: string;
  nama: string;
};

/**
 * Get all provinces in Indonesia (kode length 2).
 */
export async function getProvinces(): Promise<WilayahOption[]> {
  return await db
    .select()
    .from(wilayah)
    .where(sql`LENGTH(kode) = 2`)
    .orderBy(wilayah.nama);
}

/**
 * Get cities/regencies for a province (kode XX.YY).
 */
export async function getCities(provinceCode: string): Promise<WilayahOption[]> {
  if (!provinceCode) return [];
  return await db
    .select()
    .from(wilayah)
    .where(
      and(
        sql`LENGTH(kode) = 5`,
        like(wilayah.kode, `${provinceCode}.%`)
      )
    )
    .orderBy(wilayah.nama);
}

/**
 * Get districts for a city/regency (kode XX.YY.ZZ).
 */
export async function getDistricts(cityCode: string): Promise<WilayahOption[]> {
  if (!cityCode) return [];
  return await db
    .select()
    .from(wilayah)
    .where(
      and(
        sql`LENGTH(kode) = 8`,
        like(wilayah.kode, `${cityCode}.%`)
      )
    )
    .orderBy(wilayah.nama);
}

/**
 * Get villages for a district (kode XX.YY.ZZ.WWWW).
 */
export async function getVillages(districtCode: string): Promise<WilayahOption[]> {
  if (!districtCode) return [];
  return await db
    .select()
    .from(wilayah)
    .where(
      and(
        sql`LENGTH(kode) = 13`,
        like(wilayah.kode, `${districtCode}.%`)
      )
    )
    .orderBy(wilayah.nama);
}
