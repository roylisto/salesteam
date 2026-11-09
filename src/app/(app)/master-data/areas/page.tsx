import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices, notDeleted } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { AreasClient } from "./areas-client";
import type { AreaRow } from "./types";

export const metadata: Metadata = { title: "Manajemen Area" };

export default async function AreasPage({ searchParams }: PageProps<"/master-data/areas">) {
  const user = await requirePermission("areas");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="areas" path="/master-data/areas" title="Manajemen Area" label="Daftar Area" params={params} />;
  }
  const { organization } = user;

  const areaRows = await db
    .select({
      id: areaOffices.id,
      name: areaOffices.name,
      createdAt: areaOffices.createdAt,
      updatedAt: areaOffices.updatedAt,
    })
    .from(areaOffices)
    .where(
      and(eq(areaOffices.organizationId, organization.id), notDeleted(areaOffices)),
    )
    .orderBy(asc(areaOffices.name));

  const areas: AreaRow[] = areaRows.map((area) => ({
    ...area,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Manajemen Area"
        description="Pengelompokan wilayah untuk gudang dan outlet di organisasi ini."
      />
      <AuditTabs path="/master-data/areas" label="Daftar Area" />
      <AreasClient areas={areas} />
    </div>
  );
}
