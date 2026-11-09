import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, organizations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OrganizationForm } from "./organization-form";
import type { OrganizationDetail } from "./types";

export const metadata: Metadata = { title: "Organisasi" };

export default async function OrganizationPage({ searchParams }: PageProps<"/settings/organization">) {
  const user = await requirePermission("organization");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="organization" path="/settings/organization" title="Organisasi" label="Pengaturan" params={params} />;
  }

  const [row] = await db
    .select({
      name: organizations.name,
      legalName: organizations.legalName,
      email: organizations.email,
      phone: organizations.phone,
      address: organizations.address,
      logoUrl: organizations.logoUrl,
      currency: organizations.currency,
      timezone: organizations.timezone,
      province: organizations.province,
      city: organizations.city,
      district: organizations.district,
      village: organizations.village,
      latitude: organizations.latitude,
      longitude: organizations.longitude,
    })
    .from(organizations)
    .where(
      and(eq(organizations.id, user.organization.id), notDeleted(organizations)),
    )
    .limit(1);

  if (!row) {
    return (
      <div className="w-full">
        <PageHeader
          title="Organisasi"
          description="Kelola profil dan branding perusahaan ini."
        />
        <p className="text-muted-foreground text-sm">Organisasi tidak ditemukan.</p>
      </div>
    );
  }

  const organization: OrganizationDetail = { ...row };

  return (
    <div className="w-full">
      <PageHeader
        title="Organisasi"
        description="Profil perusahaan, logo branding, dan pengaturan regional."
      />
      <AuditTabs path="/settings/organization" label="Pengaturan" />
      <div className="w-full">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  );
}
