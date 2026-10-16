"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "@/components/brand";
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
  roleName: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
};

const PRIMARY_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    permission: "dashboard",
  },
];

const SETTINGS_NAV: NavItem[] = [
  {
    label: "Team",
    href: "/settings/team",
    icon: UsersIcon,
    permission: "team",
  },
  {
    label: "Roles & permissions",
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
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
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
}: {
  user: ShellUser;
  permissions: string[];
  onNavigate?: () => void;
}) {
  const primary = PRIMARY_NAV.filter((item) =>
    permissions.includes(item.permission),
  );
  const settings = SETTINGS_NAV.filter((item) =>
    permissions.includes(item.permission),
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <Brand className="px-1.5 pt-1.5" />

      <div className="flex-1 space-y-6">
        {primary.length > 0 ? (
          <NavLinks items={primary} onNavigate={onNavigate} />
        ) : null}

        {settings.length > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground px-2.5 text-xs font-medium">
              Settings
            </p>
            <NavLinks items={settings} onNavigate={onNavigate} />
          </div>
        ) : null}
      </div>

      <div className="bg-muted/40 rounded-lg p-2.5">
        <p className="truncate text-sm font-medium">{user.organizationName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {user.roleName ?? "Member"}
        </p>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [pending, startTransition] = useTransition();

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
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => logout())}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[15rem_1fr]">
      <aside className="bg-sidebar sticky top-0 hidden h-svh border-r lg:block">
        <SidebarContent user={user} permissions={permissions} />
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-3 backdrop-blur lg:px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-lg transition-colors lg:hidden">
              <MenuIcon className="size-4" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent
                user={user}
                permissions={permissions}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 px-3 py-3 lg:px-4 lg:py-4">{children}</main>
      </div>
    </div>
  );
}
