export type RoleOption = {
  id: number;
  name: string;
};

export type AreaOption = {
  id: number;
  name: string;
};

export type WarehouseOption = {
  id: number;
  name: string;
  areaOfficeId: number;
};

export type MemberRow = {
  id: number;
  name: string;
  email: string;
  code: string | null;
  phone: string | null;
  roleId: number | null;
  roleName: string | null;
  isAdmin: boolean;
  reportsTo: number | null;
  reportsToName: string | null;
  areaIds: number[];
  areaNames: string[];
  warehouseIds: number[];
  isActive: boolean;
  isOrganizationOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
