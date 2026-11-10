export const CATALOG_SECTIONS = {
  brands: { title: "Brand", permission: "product_brands" },
  types: { title: "Tipe Produk", permission: "product_types" },
  units: { title: "Satuan", permission: "product_units" },
  list: { title: "Daftar Produk", permission: "products" },
  prices: { title: "Harga Jual", permission: "product_prices" },
} as const;

export type CatalogSection = keyof typeof CATALOG_SECTIONS;
export type CatalogOption = { value: string; label: string };
export function isCatalogSection(section: string): section is CatalogSection {
  return Object.hasOwn(CATALOG_SECTIONS, section);
}
export const catalogPath = (section: CatalogSection) => `/master-data/products/${section}`;
