export type OrganizationDetail = {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
};
