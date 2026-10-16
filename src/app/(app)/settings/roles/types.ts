export type RoleDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  memberCount: number;
  createdAt: string;
};
