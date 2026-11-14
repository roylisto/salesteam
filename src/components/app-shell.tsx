"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProgressTransition } from "@/components/action-progress";
import {
  BoxesIcon,
  ShoppingCartIcon,
  PrinterIcon,
  Building2Icon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapPinIcon,
  MenuIcon,
  ShieldCheckIcon,
  StoreIcon,
  TagsIcon,
  UserIcon,
  UsersIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "@/components/brand";
import appIcon from "@/app/icon.png";
import appPackage from "../../package.json";
import { CATALOG_SECTIONS, catalogPath, type CatalogSection } from "@/lib/catalog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type ShellUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  organizationName: string;
  organizationLogoUrl: string | null;
  roleName: string | null;
};

const SIDEBAR_WIDTH_EXPANDED = 16; // rem (w-64)
const SIDEBAR_WIDTH_COLLAPSED = 4; // rem (w-16)

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  children?: NavItem[];
};

const PRIMARY_NAV: NavItem[] = [
  { label: "Order Penjualan", href: "/orders", icon: ShoppingCartIcon, permission: "orders" },
  {
    label: "Dasbor",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    permission: "dashboard",
  },
];

const MASTER_NAV: NavItem[] = [
  {
    label: "Manajemen Stok",
    href: "/inventory/warehouses",
    icon: BoxesIcon,
    permission: "warehouse_movements",
    children: [
      { label: "Stok Gudang", href: "/inventory/warehouses", icon: WarehouseIcon, permission: "warehouse_movements" },
      { label: "Stok Sales", href: "/inventory/sales", icon: UsersIcon, permission: "sales_inventory" },
    ],
  },
  {
    label: "Manajemen Produk",
    href: catalogPath("list"),
    icon: BoxesIcon,
    permission: "products",
    children: (["list", "brands", "types", "units", "prices"] as CatalogSection[]).map((section) => ({
      label: CATALOG_SECTIONS[section].title,
      href: catalogPath(section),
      icon: section === "list" ? BoxesIcon : TagsIcon,
      permission: CATALOG_SECTIONS[section].permission,
    })),
  },
  {
    label: "Manajemen Area",
    href: "/master-data/areas",
    icon: MapPinIcon,
    permission: "areas",
  },
  {
    label: "Manajemen Gudang",
    href: "/master-data/warehouses",
    icon: WarehouseIcon,
    permission: "warehouses",
    children: [
      { label: "Daftar Gudang", href: "/master-data/warehouses", icon: WarehouseIcon, permission: "warehouses" },
      { label: "Tipe Gudang", href: "/master-data/warehouse-types", icon: BoxesIcon, permission: "warehouse_types" },
    ],
  },
  {
    label: "Manajemen Outlet",
    href: "/master-data/outlets",
    icon: StoreIcon,
    permission: "outlets",
    children: [
      { label: "Daftar Outlet", href: "/master-data/outlets", icon: StoreIcon, permission: "outlets" },
      { label: "Tipe Outlet", href: "/master-data/outlet-types", icon: TagsIcon, permission: "outlet_types" },
    ],
  },
];

const SETTINGS_NAV: NavItem[] = [
  { label: "Printer & Template", href: "/settings/printers", icon: PrinterIcon, permission: "printer_settings" },
  {
    label: "Organisasi",
    href: "/settings/organization",
    icon: Building2Icon,
    permission: "organization",
  },
  {
    label: "Tim",
    href: "/settings/team",
    icon: UsersIcon,
    permission: "team",
  },
  {
    label: "Peran & Izin",
    href: "/settings/roles",
    icon: ShieldCheckIcon,
    permission: "roles",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLinks({
  items,
  onNavigate,
  collapsed = false,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (item.children) {
          const groupActive = item.children.some(
            (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
          );
          const groupClassName = cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
            groupActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          );

          if (collapsed) {
            return (
              <DropdownMenu key={item.href}>
                <DropdownMenuTrigger
                  className={cn(groupClassName, "justify-center px-2")}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="size-4 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                    {item.children.map((child) => (
                      <DropdownMenuItem
                        key={child.href}
                        render={<Link href={child.href} aria-current={pathname === child.href || pathname.startsWith(`${child.href}/`) ? "page" : undefined} />}
                        nativeButton={false}
                        onClick={onNavigate}
                      >
                        <child.icon />
                        {child.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <details key={item.href} open className="group/nav">
              <summary className={cn(groupClassName, "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                <ChevronRightIcon className="ml-auto size-4 shrink-0 transition-transform group-open/nav:rotate-90" />
              </summary>
              <div className="border-sidebar-border ml-4 mt-1 border-l pl-2">
                <NavLinks items={item.children} onNavigate={onNavigate} />
              </div>
            </details>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  permissions,
  onNavigate,
  collapsed = false,
}: {
  user: ShellUser;
  permissions: string[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const primary = PRIMARY_NAV.filter((item) =>
    permissions.includes(item.permission),
  );
  const master = MASTER_NAV.flatMap((item) => {
    if (item.children) {
      const children = item.children.filter((child) => permissions.includes(child.permission));
      return children.length > 0 ? [{ ...item, children }] : [];
    }
    return permissions.includes(item.permission) ? [item] : [];
  });
  const settings = SETTINGS_NAV.filter((item) =>
    permissions.includes(item.permission),
  );

  return (
    <div className={cn("text-sidebar-foreground flex h-full flex-col gap-6 p-3", collapsed && "px-2")}>
      <Brand
        className="shrink-0 px-1.5 pt-1.5"
        name={user.organizationName}
        logoUrl={user.organizationLogoUrl}
        collapsed={collapsed}
      />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        {primary.length > 0 ? (
          <NavLinks items={primary} onNavigate={onNavigate} collapsed={collapsed} />
        ) : null}

        {master.length > 0 ? (
          <div className="space-y-1">
            {!collapsed && (
              <p className="text-sidebar-foreground/50 px-2.5 text-xs font-medium">
                Data Induk
              </p>
            )}
            <NavLinks items={master} onNavigate={onNavigate} collapsed={collapsed} />
          </div>
        ) : null}

        {settings.length > 0 ? (
          <div className="space-y-1">
            {!collapsed && (
              <p className="text-sidebar-foreground/50 px-2.5 text-xs font-medium">
                Pengaturan
              </p>
            )}
            <NavLinks items={settings} onNavigate={onNavigate} collapsed={collapsed} />
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "text-sidebar-foreground/50 flex shrink-0 items-center gap-2 px-1.5 text-[11px]",
          collapsed && "flex-col gap-1 px-0",
        )}
        title={`Salesteam v${appPackage.version}`}
      >
        <Image src={appIcon} alt="Salesteam" className="size-5 shrink-0 object-contain" sizes="20px" />
        <span className={cn("tabular-nums", collapsed && "text-[9px]")}>
          {!collapsed && "Salesteam · "}v{appPackage.version}
        </span>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [pending, startTransition] = useProgressTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted data-popup-open:bg-muted flex w-full items-center gap-2 rounded-lg p-1 pr-2 outline-none transition-colors">
        <Avatar className="size-7">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm leading-tight font-medium">
            {user.name}
          </span>
          <span className="text-muted-foreground block truncate text-xs leading-tight">
            {user.email}
          </span>
        </span>
        <ChevronsUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate">{user.name}</span>
            <span className="text-muted-foreground block truncate font-normal">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/profile" />}
          nativeButton={false}
        >
          <UserIcon />
          Profil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => logout())}
        >
          <LogOutIcon />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapseButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-0 top-12 -translate-x-1/2 lg:block hidden z-10"
      onClick={onClick}
      aria-label={collapsed ? "Perluas sidebar" : "Lipat sidebar"}
      style={{
        right: collapsed ? `${SIDEBAR_WIDTH_COLLAPSED}rem` : `${SIDEBAR_WIDTH_EXPANDED}rem`,
      }}
    >
      {collapsed ? <ChevronRightIcon className="size-4" /> : <MenuIcon className="size-4" />}
    </Button>
  );
}

export function AppShell({
  user,
  permissions,
  children,
}: {
  user: ShellUser;
  permissions: string[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div
      className="lg:grid lg:h-svh transition-all duration-200"
      style={{
        gridTemplateColumns: `${sidebarWidth}rem 1fr`,
      } as React.CSSProperties}
    >
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-svh border-r lg:block relative transition-all duration-200 overflow-y-auto",
        )}
        style={{ width: `${sidebarWidth}rem` }}
      >
        <SidebarContent user={user} permissions={permissions} collapsed={collapsed} />
        <CollapseButton collapsed={collapsed} onClick={() => setCollapsed((c) => !c)} />
      </aside>

      <div className="flex h-svh flex-col overflow-hidden">
        <header className="bg-background/80 sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b px-3 backdrop-blur lg:px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-lg transition-colors lg:hidden">
              <MenuIcon className="size-4" />
              <span className="sr-only">Buka navigasi</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-sidebar text-sidebar-foreground border-sidebar-border w-72 gap-0 p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigasi</SheetTitle>
              </SheetHeader>
              <SidebarContent
                user={user}
                permissions={permissions}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="lg:flex hidden"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Perluas sidebar" : "Lipat sidebar"}
          >
            {collapsed ? <ChevronRightIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-3 lg:px-4 lg:py-4">{children}</main>
      </div>
    </div>
  );
}
