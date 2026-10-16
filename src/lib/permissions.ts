/**
 * Catalogue of assignable module permissions and the role presets that are
 * seeded when a new organization is created.
 *
 * Ported from the legacy Laravel `config/permissions.php`, renamed to English.
 */

export const PERMISSIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "outlets", label: "Outlets" },
  { key: "warehouses", label: "Warehouses" },
  { key: "warehouse_movements", label: "Warehouse Movements" },
  { key: "sales_inventory", label: "Sales Inventory" },
  { key: "sales_stock", label: "Sales Stock Transactions" },
  { key: "orders", label: "Sales Orders" },
  { key: "visits", label: "Call Visits" },
  { key: "finance", label: "Finance" },
  { key: "payments", label: "Payment Methods" },
  { key: "areas", label: "Area Management" },
  { key: "team", label: "Team & Accounts" },
  { key: "roles", label: "Roles & Permissions" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEYS.includes(value as PermissionKey);
}

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((permission) => permission.key === key)?.label ?? key;
}

/** Roles created for every new organization. `admin` is the default owner role. */
export const DEFAULT_ROLE_PRESETS = [
  {
    name: "Admin",
    slug: "admin",
    description: "Full access to every module in the organization.",
    permissions: PERMISSION_KEYS,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Oversees outlets, orders and call visits.",
    permissions: ["dashboard", "outlets", "orders", "visits"],
  },
  {
    name: "Sales",
    slug: "sales",
    description: "Field sales rep with call visit and order access.",
    permissions: ["dashboard", "orders", "visits"],
  },
  {
    name: "Finance",
    slug: "finance",
    description: "Handles invoices and payment methods.",
    permissions: ["dashboard", "finance", "payments"],
  },
] as const;

export const OWNER_ROLE_SLUG = "admin";
