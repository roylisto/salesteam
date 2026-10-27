export type WarehouseRow = {
  id: number;
  name: string;
  depotType: string | null;
  isActive: boolean;
  areaOfficeId: number | null;
  areaName: string | null;
  picUserId: number | null;
  picName: string | null;
  address: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseDetail = {
  id: number;
  name: string;
  depotType: string | null;
  isActive: boolean;
  areaOfficeId: number | null;
  picUserId: number | null;
  address: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AreaOption = {
  id: number;
  name: string;
};

export type BackOfficeUserOption = {
  id: number;
  name: string;
  email: string;
};
