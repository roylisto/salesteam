import {
  BookOpenIcon,
  Building2Icon,
  CakeSliceIcon,
  CoffeeIcon,
  FlowerIcon,
  FuelIcon,
  HammerIcon,
  HotelIcon,
  IceCreamConeIcon,
  PillIcon,
  SandwichIcon,
  ShirtIcon,
  ShoppingBagIcon,
  ShoppingBasketIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  StoreIcon,
  UtensilsIcon,
} from "lucide-react";
import { DEFAULT_OUTLET_COLOR, type OutletIconKey } from "@/lib/outlet-appearance";

export const OUTLET_ICONS = {
  store: { icon: StoreIcon, label: "Toko" },
  "shopping-basket": { icon: ShoppingBasketIcon, label: "Keranjang belanja" },
  "shopping-cart": { icon: ShoppingCartIcon, label: "Supermarket" },
  utensils: { icon: UtensilsIcon, label: "Restoran" },
  coffee: { icon: CoffeeIcon, label: "Kafe" },
  building: { icon: Building2Icon, label: "Gedung usaha" },
  "shopping-bag": { icon: ShoppingBagIcon, label: "Tas belanja" },
  "shirt": { icon: ShirtIcon, label: "Toko pakaian" },
  "pill": { icon: PillIcon, label: "Apotek" },
  "cake-slice": { icon: CakeSliceIcon, label: "Toko kue" },
  "sandwich": { icon: SandwichIcon, label: "Kedai makanan" },
  "hotel": { icon: HotelIcon, label: "Hotel" },
  "fuel": { icon: FuelIcon, label: "SPBU" },
  "book-open": { icon: BookOpenIcon, label: "Toko buku" },
  "smartphone": { icon: SmartphoneIcon, label: "Toko ponsel" },
  "flower": { icon: FlowerIcon, label: "Toko bunga" },
  "hammer": { icon: HammerIcon, label: "Toko perkakas" },
  "ice-cream-cone": { icon: IceCreamConeIcon, label: "Gerai es krim" },
} satisfies Record<OutletIconKey, { icon: typeof StoreIcon; label: string }>;

export function OutletTypeSymbol({ icon, color, className = "size-8" }: {
  icon: string;
  color: string;
  className?: string;
}) {
  const Icon = (OUTLET_ICONS[icon as OutletIconKey] ?? OUTLET_ICONS.store).icon;
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_OUTLET_COLOR;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-lg ${className}`} style={{ color: safeColor, backgroundColor: `${safeColor}18` }}>
      <Icon className="size-5" />
    </span>
  );
}
