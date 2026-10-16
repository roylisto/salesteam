export type RoleDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
  createdAt: string;
};
