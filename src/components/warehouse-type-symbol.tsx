import {
  ArchiveIcon,
  BarcodeIcon,
  BoxesIcon,
  ClipboardListIcon,
  ContainerIcon,
  FactoryIcon,
  ForkliftIcon,
  PackageCheckIcon,
  PackageIcon,
  PackageMinusIcon,
  PackageOpenIcon,
  PackagePlusIcon,
  PlaneIcon,
  ScaleIcon,
  ShipIcon,
  SnowflakeIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import { DEFAULT_WAREHOUSE_COLOR, type WarehouseIconKey } from "@/lib/warehouse-appearance";

export const WAREHOUSE_ICONS = {
  warehouse: { icon: WarehouseIcon, label: "Gudang" },
  boxes: { icon: BoxesIcon, label: "Tumpukan barang" },
  package: { icon: PackageIcon, label: "Paket" },
  container: { icon: ContainerIcon, label: "Kontainer" },
  forklift: { icon: ForkliftIcon, label: "Forklift" },
  truck: { icon: TruckIcon, label: "Truk distribusi" },
  "package-open": { icon: PackageOpenIcon, label: "Paket terbuka" },
  "package-check": { icon: PackageCheckIcon, label: "Paket diperiksa" },
  "package-plus": { icon: PackagePlusIcon, label: "Barang masuk" },
  "package-minus": { icon: PackageMinusIcon, label: "Barang keluar" },
  "archive": { icon: ArchiveIcon, label: "Arsip penyimpanan" },
  "factory": { icon: FactoryIcon, label: "Pabrik" },
  "snowflake": { icon: SnowflakeIcon, label: "Penyimpanan dingin" },
  "scale": { icon: ScaleIcon, label: "Timbangan barang" },
  "clipboard-list": { icon: ClipboardListIcon, label: "Daftar stok" },
  "barcode": { icon: BarcodeIcon, label: "Kode batang" },
  "ship": { icon: ShipIcon, label: "Pengiriman laut" },
  "plane": { icon: PlaneIcon, label: "Pengiriman udara" },
} satisfies Record<WarehouseIconKey, { icon: typeof WarehouseIcon; label: string }>;

export function WarehouseTypeSymbol({ icon, color, className = "size-8" }: {
  icon: string;
  color: string;
  className?: string;
}) {
  const Icon = (WAREHOUSE_ICONS[icon as WarehouseIconKey] ?? WAREHOUSE_ICONS.warehouse).icon;
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_WAREHOUSE_COLOR;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-lg ${className}`} style={{ color: safeColor, backgroundColor: `${safeColor}18` }}>
      <Icon className="size-5" />
    </span>
  );
}
