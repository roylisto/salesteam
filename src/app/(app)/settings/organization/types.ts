export type OrganizationDetail = {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
};
