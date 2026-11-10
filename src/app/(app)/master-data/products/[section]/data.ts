import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { areaOffices, brands, notDeleted, outletTypes, productPrices, products, productSellUnits, productTypes, productUnits, warehouses } from "@/db/schema";
import type { CatalogSection } from "@/lib/catalog";
import { toFileSrc } from "@/lib/files";
import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { tableOrder, tableSearch } from "@/lib/table-sql";

type Params = Record<string, string | string[] | undefined>;

export async function loadCatalogList(section: CatalogSection, organizationId: number, params: Params) {
  const { q, page, pageSize, sort, dir } = loadTableQuery(params);
  const blank = sql<null>`null`;
  const priceUnit = and(eq(productPrices.sellUnitId, productSellUnits.id), eq(productSellUnits.organizationId, organizationId), notDeleted(productSellUnits));
  const source = section === "list" ? db.select({
    id: products.id, name: products.name, image: products.imageUrl,
    detail: sql<string>`concat_ws(' · ', ${products.code}, coalesce(${brands.name}, ${products.brand}), coalesce(${productTypes.name}, ${products.productType}), ${productUnits.name})`.as("detail"),
    active: sql<boolean>`${products.status} = 'active'`.as("active"),
    amount: blank.as("amount"), scope: blank.as("scope"),
  }).from(products)
    .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.organizationId, organizationId), notDeleted(brands)))
    .leftJoin(productTypes, and(eq(products.productTypeId, productTypes.id), eq(productTypes.organizationId, organizationId), notDeleted(productTypes)))
    .leftJoin(productUnits, and(eq(products.baseUnitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
    .where(and(eq(products.organizationId, organizationId), notDeleted(products)))
    : section === "prices" ? db.select({
      id: productPrices.id, name: products.name, image: blank.as("image"),
      detail: sql<string>`concat_ws(' · ', ${products.code}, ${productUnits.name}, ${outletTypes.name}, case
        when ${productPrices.warehouseId} is not null then 'Gudang: ' || coalesce(${warehouses.name}, 'Tidak tersedia')
        when ${productPrices.areaId} is not null then 'Area: ' || coalesce(${areaOffices.name}, 'Tidak tersedia') else 'Global' end)`.as("detail"),
      active: sql<boolean>`${products.status} = 'active'`.as("active"),
      amount: productPrices.amount, scope: sql<string>`case when ${productPrices.warehouseId} is not null then 'warehouse'
        when ${productPrices.areaId} is not null then 'area' else 'global' end`.as("scope"),
    }).from(productPrices)
      .innerJoin(productSellUnits, priceUnit)
      .innerJoin(products, and(eq(productSellUnits.productId, products.id), eq(products.organizationId, organizationId), notDeleted(products)))
      .innerJoin(productUnits, and(eq(productSellUnits.unitId, productUnits.id), eq(productUnits.organizationId, organizationId), notDeleted(productUnits)))
      .leftJoin(outletTypes, and(eq(productPrices.outletTypeId, outletTypes.id), eq(outletTypes.organizationId, organizationId), notDeleted(outletTypes)))
      .leftJoin(areaOffices, and(eq(productPrices.areaId, areaOffices.id), eq(areaOffices.organizationId, organizationId), notDeleted(areaOffices)))
      .leftJoin(warehouses, and(eq(productPrices.warehouseId, warehouses.id), eq(warehouses.organizationId, organizationId), notDeleted(warehouses)))
      .where(and(eq(productPrices.organizationId, organizationId), notDeleted(productPrices)))
    : referenceSource(section, organizationId);
  const entries = source.as("entries");
  const filters = and(
    tableSearch(q, entries.name, entries.detail),
    params.status === "active" || params.status === "inactive" ? eq(entries.active, params.status === "active") : undefined,
    params.scope === "global" || params.scope === "area" || params.scope === "warehouse" ? eq(entries.scope, params.scope) : undefined,
  );
  const [{ total }] = await db.select({ total: count() }).from(entries).where(filters);
  const pagination = paginateTable(total, page, pageSize);
  const rows = await db.select().from(entries).where(filters).orderBy(tableOrder({
    name: sql`lower(${entries.name})`, detail: sql`lower(${entries.detail})`, status: entries.active, amount: entries.amount,
  }, sort, dir, asc(entries.name)), asc(entries.id)).limit(pageSize).offset(pagination.offset);
  return { pagination, rows: rows.map((row) => {
    const src = toFileSrc(row.image);
    return { ...row, image: src ? `${src}?thumbnail=catalog` : null };
  }) };
}

function referenceSource(section: "brands" | "types" | "units", organizationId: number) {
  const table = section === "brands" ? brands : section === "types" ? productTypes : productUnits;
  return db.select({
    id: table.id, name: table.name,
    image: section === "brands" ? brands.imageUrl : sql<null>`null`.as("image"),
    detail: (section === "units" ? sql<string>`case when ${productUnits.allowFraction} then 'Bisa pecahan' else 'Bilangan bulat' end` : sql<null>`null`).as("detail"),
    active: sql<boolean>`${table.isActive}`.as("active"),
    amount: sql<null>`null`.as("amount"), scope: sql<null>`null`.as("scope"),
  }).from(table).where(and(eq(table.organizationId, organizationId), notDeleted(table)));
}

export async function loadCatalogEditor(section: CatalogSection, organizationId: number, id?: number) {
  if (section === "list") {
    const [product] = id ? await db.select().from(products).where(and(eq(products.id, id), eq(products.organizationId, organizationId), notDeleted(products))) : [];
    if (id && !product) return null;
    const [brandOptions, typeOptions, unitOptions, alternatives] = await Promise.all([
      options(brands, organizationId), options(productTypes, organizationId), options(productUnits, organizationId),
      id ? db.select({ unitId: productSellUnits.unitId, factor: productSellUnits.factor }).from(productSellUnits).where(and(
        eq(productSellUnits.productId, id), eq(productSellUnits.organizationId, organizationId), notDeleted(productSellUnits),
      )) : [],
    ]);
    return { section, product, brandOptions, typeOptions, unitOptions, alternatives: alternatives.filter((unit) => unit.unitId !== product?.baseUnitId) } as const;
  }
  if (section === "prices") {
    const [price] = id ? await db.select({ ...priceFields, label: sql<string>`concat_ws(' · ', ${products.name}, ${products.code}, ${productUnits.name})` })
      .from(productPrices).innerJoin(productSellUnits, eq(productPrices.sellUnitId, productSellUnits.id))
      .innerJoin(products, eq(productSellUnits.productId, products.id)).innerJoin(productUnits, eq(productSellUnits.unitId, productUnits.id))
      .where(and(eq(productPrices.id, id), eq(productPrices.organizationId, organizationId),
        eq(productSellUnits.organizationId, organizationId), eq(products.organizationId, organizationId),
        eq(productUnits.organizationId, organizationId), notDeleted(productPrices))) : [];
    if (id && !price) return null;
    const [typeOptions, areaOptions, warehouseOptions] = await Promise.all([
      options(outletTypes, organizationId), options(areaOffices, organizationId), options(warehouses, organizationId),
    ]);
    return { section, price, typeOptions, areaOptions, warehouseOptions } as const;
  }
  const table = section === "brands" ? brands : section === "types" ? productTypes : productUnits;
  const [reference] = id ? await db.select({ id: table.id, name: table.name, isActive: table.isActive,
    imageUrl: section === "brands" ? brands.imageUrl : sql<null>`null`,
    allowFraction: section === "units" ? productUnits.allowFraction : sql<boolean>`false`,
  }).from(table).where(and(eq(table.id, id), eq(table.organizationId, organizationId), notDeleted(table))) : [];
  return id && !reference ? null : { section, reference } as const;
}

const priceFields = {
  id: productPrices.id, sellUnitId: productPrices.sellUnitId, outletTypeId: productPrices.outletTypeId,
  areaId: productPrices.areaId, warehouseId: productPrices.warehouseId, amount: productPrices.amount,
};

async function options(table: typeof brands | typeof productTypes | typeof productUnits | typeof outletTypes | typeof areaOffices | typeof warehouses, organizationId: number) {
  const rows = await db.select({ id: table.id, name: table.name }).from(table)
    .where(and(eq(table.organizationId, organizationId), notDeleted(table))).orderBy(asc(table.name));
  return rows.map((row) => ({ value: String(row.id), label: row.name }));
}

export type CatalogEditorData = NonNullable<Awaited<ReturnType<typeof loadCatalogEditor>>>;
export type CatalogListRow = Awaited<ReturnType<typeof loadCatalogList>>["rows"][number];
