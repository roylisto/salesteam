export type WarehouseRow = {
  id: number;
  name: string;
  depotType: string | null;
  isActive: boolean;
  areaOfficeId: number | null;
  areaName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AreaOption = {
  id: number;
  name: string;
};
