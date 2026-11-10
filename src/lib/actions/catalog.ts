"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import { db, type Database } from "@/db";
import { areaOffices, brands, notDeleted, outlets, outletTypes, productPrices, products, productSellUnits, productTypes, productUnits, warehouses } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { can, getCurrentUser } from "@/lib/auth";
import { CATALOG_SECTIONS, catalogPath, isCatalogSection } from "@/lib/catalog";
import { resolveOutletProductPrice } from "@/lib/product-price";
import { uploadToS3 } from "@/lib/storage";
import { tableSearch } from "@/lib/table-sql";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
const references = { brands, types: productTypes, units: productUnits };
const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const name = z.string().trim().min(1, "Nama wajib diisi.").max(150);
const amount = z.string().trim().regex(/^\d{1,14}(\.\d{1,2})?$/, "Masukkan harga dengan maksimal dua angka desimal.");
const factor = z.string().trim().regex(/^\d{1,12}(\.\d{1,6})?$/).refine((value) => Number(value) > 0);
const productInput = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi.").max(200),
  code: z.string().trim().min(1, "SKU wajib diisi.").max(80),
  brandId: id, productTypeId: id, baseUnitId: id,
  description: z.string().trim().max(2000),
  alternatives: z.array(z.object({ unitId: id, factor })).max(50),
});
const priceInput = z.object({ sellUnitId: id, outletTypeId: id, amount, scope: z.enum(["global", "area", "warehouse"]) });

async function lockCatalog(tx: Tx, organizationId: number) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`catalog:${organizationId}`}, 0))`);
}

async function saveImage(file: FormDataEntryValue | null, organizationId: number, folder: "brands" | "products") {
  if (!(file instanceof File) || file.size === 0) return null;
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || file.size > 2 * 1024 * 1024) throw new Error("Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
  if (metadata?.format !== (extension === "jpg" ? "jpeg" : extension) || !metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000) {
    throw new Error("Pilih gambar JPG, PNG, atau WebP yang valid dengan maksimal 40 megapiksel.");
  }
  const key = `organizations/${organizationId}/${folder}/${randomUUID()}.${extension}`;
  await uploadToS3(key, bytes, file.type);
  return key;
}

function refreshCatalog() {
  for (const section of Object.keys(CATALOG_SECTIONS)) {
    if (isCatalogSection(section)) revalidatePath(catalogPath(section));
  }
}

export async function saveCatalog(section: string, form: FormData): Promise<{ ok?: true; error?: string }> {
  if (!isCatalogSection(section)) return { error: "Menu tidak ditemukan." };
  const user = await getCurrentUser();
  const permission = CATALOG_SECTIONS[section].permission;
  if (!user || !can(user, permission)) return { error: "Anda tidak memiliki izin untuk menyimpan data ini." };
  const organizationId = user.organization.id;
  const rawId = form.get("id");
  const parsedId = rawId ? id.safeParse(rawId) : null;
  if (parsedId && !parsedId.success) return { error: "Data tidak ditemukan." };
  const entityId = parsedId?.data;
  const isActive = form.get("isActive") === "on";

  try {
    if (section === "list") {
      let alternatives: unknown;
      try { alternatives = JSON.parse(String(form.get("alternatives") ?? "[]")); }
      catch { return { error: "Satuan jual tidak valid." }; }
      const parsed = productInput.safeParse({ ...Object.fromEntries(form), alternatives });
      if (!parsed.success) return { error: "Lengkapi nama, SKU, brand, tipe, satuan dasar, dan konversi satuan jual yang valid." };
      const { baseUnitId, brandId, productTypeId, code, name: productName, description } = parsed.data;
      const sellUnits = [{ unitId: baseUnitId, factor: "1" }, ...parsed.data.alternatives];
      const ids = sellUnits.map((unit) => unit.unitId);
      if (new Set(ids).size !== ids.length) return { error: "Setiap satuan jual hanya boleh dipilih sekali." };
      const result = await db.transaction(async (tx) => {
        await lockCatalog(tx, organizationId);
        const [brand] = await tx.select({ id: brands.id }).from(brands)
          .where(and(eq(brands.id, brandId), eq(brands.organizationId, organizationId), notDeleted(brands)));
        const [type] = await tx.select({ id: productTypes.id }).from(productTypes)
          .where(and(eq(productTypes.id, productTypeId), eq(productTypes.organizationId, organizationId), notDeleted(productTypes)));
        const units = await tx.select({ id: productUnits.id }).from(productUnits)
          .where(and(inArray(productUnits.id, ids), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)));
        if (!brand || !type || units.length !== ids.length) return { error: "Brand, tipe, atau satuan tidak tersedia." };
        const scope = and(eq(products.organizationId, organizationId), notDeleted(products));
        const [existing] = entityId ? await tx.select().from(products).where(and(scope, eq(products.id, entityId))) : [];
        if (entityId && !existing) return { error: "Produk tidak ditemukan." };
        const [duplicate] = await tx.select({ id: products.id }).from(products).where(and(scope, eq(products.code, code)));
        if (duplicate && duplicate.id !== entityId) return { error: "SKU sudah digunakan." };
        const currentUnits = existing ? await tx.select().from(productSellUnits).where(and(
          eq(productSellUnits.productId, existing.id), eq(productSellUnits.organizationId, organizationId), notDeleted(productSellUnits),
        )) : [];
        const removedIds = currentUnits.filter((unit) => !ids.includes(unit.unitId)).map((unit) => unit.id);
        if (removedIds.length) {
          const [price] = await tx.select({ id: productPrices.id }).from(productPrices).where(and(
            eq(productPrices.organizationId, organizationId), inArray(productPrices.sellUnitId, removedIds), notDeleted(productPrices),
          )).limit(1);
          if (price) return { error: "Hapus harga jual satuan yang ingin dilepas terlebih dahulu." };
        }
        const imageUrl = await saveImage(form.get("image"), organizationId, "products") ?? existing?.imageUrl;
        if (!imageUrl) return { error: "Foto produk wajib diunggah." };
        const values = { brandId, productTypeId, baseUnitId, code, name: productName, description, imageUrl, status: isActive ? "active" : "inactive" };
        const [product] = existing
          ? await tx.update(products).set(values).where(and(scope, eq(products.id, existing.id))).returning({ id: products.id, name: products.name })
          : await tx.insert(products).values({ ...values, organizationId }).returning({ id: products.id, name: products.name });
        if (removedIds.length) await tx.update(productSellUnits).set({ deletedAt: new Date() }).where(inArray(productSellUnits.id, removedIds));
        for (const unit of sellUnits) {
          const current = currentUnits.find((row) => row.unitId === unit.unitId);
          if (current) await tx.update(productSellUnits).set({ factor: unit.factor }).where(eq(productSellUnits.id, current.id));
          else await tx.insert(productSellUnits).values({ ...unit, organizationId, productId: product.id });
        }
        await recordAudit(tx, user, permission, existing ? "update" : "create", product);
        return { ok: true as const };
      });
      if (result.ok) refreshCatalog();
      return result;
    }

    if (section === "prices") {
      const parsed = priceInput.safeParse(Object.fromEntries(form));
      if (!parsed.success) return { error: "Pilih satuan jual, tipe outlet, cakupan, dan harga yang valid." };
      const { sellUnitId, outletTypeId, scope, amount } = parsed.data;
      const locationId = scope === "global" ? null : id.safeParse(form.get("locationId"));
      if (locationId && !locationId.success) return { error: "Pilih area atau gudang untuk cakupan ini." };
      const areaId = scope === "area" ? locationId?.data ?? null : null;
      const warehouseId = scope === "warehouse" ? locationId?.data ?? null : null;
      const result = await db.transaction(async (tx) => {
        await lockCatalog(tx, organizationId);
        const [product] = await tx.select({ name: products.name, unit: productUnits.name }).from(productSellUnits)
          .innerJoin(products, and(eq(productSellUnits.productId, products.id), eq(products.organizationId, organizationId), notDeleted(products)))
          .innerJoin(productUnits, and(eq(productSellUnits.unitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
          .where(and(eq(productSellUnits.id, sellUnitId), eq(productSellUnits.organizationId, organizationId), notDeleted(productSellUnits)));
        const [type] = await tx.select({ name: outletTypes.name }).from(outletTypes)
          .where(and(eq(outletTypes.id, outletTypeId), eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)));
        if (!product || !type) return { error: "Produk, satuan jual, atau tipe outlet tidak tersedia." };
        const location = scope === "area" ? areaOffices : warehouses;
        let scopeName = "Global";
        if (locationId?.data) {
          const [row] = await tx.select({ name: location.name }).from(location).where(and(
            eq(location.id, locationId.data), eq(location.organizationId, organizationId), notDeleted(location),
          ));
          if (!row) return { error: "Area atau gudang tidak tersedia." };
          scopeName = `${scope === "area" ? "Area" : "Gudang"}: ${row.name}`;
        }
        const values = { sellUnitId, outletTypeId, amount, areaId, warehouseId };
        const [saved] = entityId
          ? await tx.update(productPrices).set(values).where(and(eq(productPrices.id, entityId), eq(productPrices.organizationId, organizationId), notDeleted(productPrices))).returning({ id: productPrices.id })
          : await tx.insert(productPrices).values({ ...values, organizationId }).returning({ id: productPrices.id });
        if (!saved) return { error: "Harga jual tidak ditemukan." };
        await recordAudit(tx, user, permission, entityId ? "update" : "create", {
          ...saved, name: `${product.name} · ${product.unit} · ${type.name} · ${scopeName} · ${amount}`,
        });
        return { ok: true as const };
      });
      if (result.ok) refreshCatalog();
      return result;
    }

    const parsedName = name.safeParse(form.get("name"));
    if (!parsedName.success) return { error: "Isi nama dengan maksimal 150 karakter." };
    const table = references[section];
    const result = await db.transaction(async (tx) => {
      await lockCatalog(tx, organizationId);
      const scope = and(eq(table.organizationId, organizationId), notDeleted(table));
      const [existing] = entityId ? await tx.select({ id: table.id }).from(table).where(and(scope, eq(table.id, entityId))) : [];
      if (entityId && !existing) return { error: "Data tidak ditemukan." };
      const [duplicate] = await tx.select({ id: table.id }).from(table).where(and(scope, eq(table.name, parsedName.data)));
      if (duplicate && duplicate.id !== entityId) return { error: "Nama sudah digunakan." };
      const imageUrl = section === "brands" ? await saveImage(form.get("image"), organizationId, "brands") : null;
      const values = { name: parsedName.data, isActive,
        ...(imageUrl ? { imageUrl } : {}), ...(section === "units" ? { allowFraction: form.get("allowFraction") === "on" } : {}),
      };
      const [saved] = existing
        ? await tx.update(table).set(values).where(and(scope, eq(table.id, existing.id))).returning({ id: table.id, name: table.name })
        : await tx.insert(table).values({ ...values, organizationId }).returning({ id: table.id, name: table.name });
      await recordAudit(tx, user, permission, existing ? "update" : "create", saved);
      return { ok: true as const };
    });
    if (result.ok) refreshCatalog();
    return result;
  } catch (error) {
    const cause = error instanceof Error ? error.cause as { code?: string } | undefined : undefined;
    if (cause?.code === "23505" || (error && typeof error === "object" && "code" in error && error.code === "23505")) {
      return { error: "Data atau kombinasi harga ini sudah tersedia." };
    }
    if (error instanceof Error && error.message.startsWith("Pilih gambar")) return { error: error.message };
    console.error("[catalog] save failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Data tidak dapat disimpan. Silakan coba lagi." };
  }
}

export async function deleteCatalog(section: string, entityId: number): Promise<{ ok?: true; error?: string }> {
  if (!isCatalogSection(section) || !id.safeParse(entityId).success) return { error: "Data tidak ditemukan." };
  const user = await getCurrentUser();
  const permission = CATALOG_SECTIONS[section].permission;
  if (!user || !can(user, permission)) return { error: "Anda tidak memiliki izin untuk menghapus data ini." };
  const orgId = user.organization.id;
  const deletedAt = new Date();
  const result = await db.transaction(async (tx) => {
    await lockCatalog(tx, orgId);
    let entity: { id: number; name?: string | null } | undefined;
    if (section === "prices") {
      [entity] = await tx.update(productPrices).set({ deletedAt }).where(and(eq(productPrices.id, entityId), eq(productPrices.organizationId, orgId), notDeleted(productPrices)))
        .returning({ id: productPrices.id, name: sql<string>`'Harga ' || ${productPrices.amount}` });
    } else if (section === "list") {
      [entity] = await tx.update(products).set({ deletedAt }).where(and(eq(products.id, entityId), eq(products.organizationId, orgId), notDeleted(products)))
        .returning({ id: products.id, name: products.name });
      if (entity) {
        const units = await tx.update(productSellUnits).set({ deletedAt }).where(and(eq(productSellUnits.productId, entityId), eq(productSellUnits.organizationId, orgId), notDeleted(productSellUnits)))
          .returning({ id: productSellUnits.id });
        if (units.length) {
          const prices = await tx.update(productPrices).set({ deletedAt }).where(and(inArray(productPrices.sellUnitId, units.map((unit) => unit.id)), eq(productPrices.organizationId, orgId), notDeleted(productPrices)))
            .returning({ id: productPrices.id });
          for (const price of prices) await recordAudit(tx, user, "product_prices", "delete", { ...price, name: entity.name });
        }
      }
    } else {
      const table = references[section];
      const ref = section === "brands" ? products.brandId : section === "types" ? products.productTypeId : products.baseUnitId;
      const [used] = await tx.select({ id: products.id }).from(products).where(and(eq(ref, entityId), eq(products.organizationId, orgId), notDeleted(products))).limit(1);
      const [usedUnit] = section === "units" ? await tx.select({ id: productSellUnits.id }).from(productSellUnits).where(and(
        eq(productSellUnits.unitId, entityId), eq(productSellUnits.organizationId, orgId), notDeleted(productSellUnits),
      )).limit(1) : [];
      if (used || usedUnit) return { error: "Data masih digunakan oleh produk. Lepaskan dari produk terlebih dahulu." };
      [entity] = await tx.update(table).set({ deletedAt }).where(and(eq(table.id, entityId), eq(table.organizationId, orgId), notDeleted(table)))
        .returning({ id: table.id, name: table.name });
    }
    if (!entity) return { error: "Data tidak ditemukan." };
    await recordAudit(tx, user, permission, "delete", entity);
    return { ok: true as const };
  });
  if (result.ok) refreshCatalog();
  return result;
}

export async function previewCatalogPrice(sellUnitId: number, outletId: number) {
  const user = await getCurrentUser();
  if (!user || !can(user, "product_prices") || !id.safeParse(sellUnitId).success || !id.safeParse(outletId).success) return null;
  return resolveOutletProductPrice(user.organization.id, sellUnitId, outletId);
}

export async function searchCatalogOptions(kind: "outlet" | "sell-unit", query: string) {
  const user = await getCurrentUser();
  if (!user || !can(user, "product_prices") || typeof query !== "string") return [];
  const needle = query.trim().slice(0, 100);
  if (needle.length < 2) return [];
  const orgId = user.organization.id;
  if (kind === "outlet") {
    const rows = await db.select({ id: outlets.id, label: sql<string>`concat_ws(' · ', ${outlets.name}, ${outlets.code}, ${outlets.city})` })
      .from(outlets).where(and(eq(outlets.organizationId, orgId), notDeleted(outlets), tableSearch(needle, outlets.name, outlets.code)))
      .orderBy(asc(outlets.name), asc(outlets.id)).limit(25);
    return rows.map((row) => ({ value: String(row.id), label: row.label || `Outlet #${row.id}` }));
  }
  if (kind !== "sell-unit") return [];
  const rows = await db.select({ id: productSellUnits.id, label: sql<string>`concat_ws(' · ', ${products.name}, ${products.code}, ${productUnits.name})` })
    .from(productSellUnits)
    .innerJoin(products, and(eq(productSellUnits.productId, products.id), eq(products.organizationId, orgId), notDeleted(products)))
    .innerJoin(productUnits, and(eq(productSellUnits.unitId, productUnits.id), eq(productUnits.organizationId, orgId), notDeleted(productUnits)))
    .where(and(eq(productSellUnits.organizationId, orgId), notDeleted(productSellUnits), tableSearch(needle, products.name, products.code)))
    .orderBy(asc(products.name), asc(productSellUnits.id)).limit(25);
  return rows.map((row) => ({ value: String(row.id), label: row.label }));
}
