import type { Metadata } from "next";
import { count, and, eq } from "drizzle-orm";
import {
  BuildingIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { notDeleted, roles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PERMISSION_KEYS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dasbor" };

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { organization } = user;

  const [[memberCount], [roleCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organization.id),
          notDeleted(users),
        ),
      ),
    db
      .select({ value: count() })
      .from(roles)
      .where(
        and(
          eq(roles.organizationId, organization.id),
          notDeleted(roles),
        ),
      ),
  ]);

  const granted = user.permissions.length;

  return (
    <div className="w-full">
      <PageHeader
        title={`Selamat datang kembali, ${user.name.split(" ")[0]}`}
        description={`Berikut ringkasan singkat tentang ${organization.name}.`}
      />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UsersIcon}
          label="Anggota tim"
          value={memberCount?.value ?? 0}
          hint="Orang yang memiliki akses ke organisasi ini"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Peran"
          value={roleCount?.value ?? 0}
          hint="Preset izin yang tersedia"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Akses Anda"
          value={`${granted}/${PERMISSION_KEYS.length}`}
          hint={
            user.isOrganizationOwner
              ? "Akses penuh (Pemilik Organisasi)"
              : `Peran: ${user.role?.name ?? "Belum ada peran"}`
          }
        />
        <StatCard
          icon={BuildingIcon}
          label="Organisasi"
          value={organization.name}
          hint={`Mata uang: ${organization.currency} · Zona waktu: ${organization.timezone}`}
        />
      </div>
    </div>
  );
}
