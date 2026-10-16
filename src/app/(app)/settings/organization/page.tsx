import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OrganizationForm } from "./organization-form";
import type { OrganizationDetail } from "./types";

export const metadata: Metadata = { title: "Organization" };

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
    })
    .from(organizations)
    .where(eq(organizations.id, user.organization.id))
    .limit(1);

  if (!row) {
    return (
      <div className="w-full">
        <PageHeader
          title="Organization"
          description="Manage this company's profile and branding."
        />
        <p className="text-muted-foreground text-sm">Organization not found.</p>
      </div>
    );
  }

  const organization: OrganizationDetail = { ...row };

  return (
    <div className="w-full">
      <PageHeader
        title="Organization"
        description="Company profile, branding logo and regional settings."
      />
      <div className="max-w-3xl">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  );
}
