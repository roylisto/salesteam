import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, organizations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OrganizationForm } from "./organization-form";
import type { OrganizationDetail } from "./types";

export const metadata: Metadata = { title: "Organisasi" };

export default async function OrganizationPage() {
  const user = await requirePermission("organization");

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
      <div className="w-full">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  );
}
