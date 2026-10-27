/**
 * Catalogue of assignable module permissions.
 *
 * Roles are user-defined per organization. `admin` is a system role that is
 * never stored in the database: it grants every permission and is always
 * offered in the role dropdown when adding a member.
 *
 * Ported from the legacy Laravel `config/permissions.php`, renamed to English.
 */

export const PERMISSIONS = [
  { key: "dashboard", label: "Dasbor" },
  { key: "products", label: "Produk" },
  { key: "outlets", label: "Outlet" },
  { key: "outlet_types", label: "Tipe Outlet" },
  { key: "warehouses", label: "Gudang" },
  { key: "warehouse_movements", label: "Mutasi Gudang" },
  { key: "sales_inventory", label: "Stok Sales" },
  { key: "sales_stock", label: "Transaksi Stok Sales" },
  { key: "orders", label: "Pesanan Penjualan" },
  { key: "visits", label: "Kunjungan" },
  { key: "finance", label: "Keuangan" },
  { key: "payments", label: "Metode Pembayaran" },
  { key: "areas", label: "Manajemen Area" },
  { key: "organization", label: "Pengaturan Organisasi" },
  { key: "team", label: "Tim & Akun" },
  { key: "roles", label: "Peran & Izin" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEYS.includes(value as PermissionKey);
}

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((permission) => permission.key === key)?.label ?? key;
}

/**
 * Permissions that are reserved for the Admin role and never assignable to
 * other roles. Organization settings and roles management are admin-only
 * by default, so they never appear in the role checklist.
 */
export const ADMIN_ONLY_PERMISSIONS: readonly string[] = [
  "organization",
  "roles",
];

/** Permissions shown as checkboxes when creating or editing a non-admin role. */
export const ASSIGNABLE_PERMISSIONS = PERMISSIONS.filter(
  (permission) => !ADMIN_ONLY_PERMISSIONS.includes(permission.key),
);

/** Virtual role value used in dropdowns for the system Admin (never in the DB). */
export const SYSTEM_ADMIN_ROLE_VALUE = "admin";

/** Slug reserved for the system Admin. Never stored in `roles`. */
export const OWNER_ROLE_SLUG = "admin";
