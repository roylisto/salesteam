export type WarehouseOption = {
  id: number;
  name: string;
};

export type MemberOption = {
  id: number;
  name: string;
};

export type OutletTypeOption = {
  id: number;
  name: string;
};

export type OutletRow = {
  id: number;
  code: string | null;
  name: string | null;
  status: string;
  warehouseId: number | null;
  warehouseName: string | null;
  salesId: number | null;
  salesName: string | null;
  outletTypeId: number | null;
  outletTypeName: string | null;
  city: string | null;
  province: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutletDetail = OutletRow & {
  imageUrl: string | null;
  notes: string | null;
  address: string | null;
  addressDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  district: string | null;
  village: string | null;
  postalCode: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  taxId: string | null;
  familyCardNumber: string | null;
  businessId: string | null;
};
