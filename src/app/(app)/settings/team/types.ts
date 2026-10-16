export type RoleOption = {
  id: number;
  name: string;
};

export type AreaOption = {
  id: number;
  name: string;
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
  isActive: boolean;
  isOrganizationOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
