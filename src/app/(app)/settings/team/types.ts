export type RoleOption = {
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
  isActive: boolean;
  isOrganizationOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
