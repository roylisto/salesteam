import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices, notDeleted } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { AreasClient } from "./areas-client";
import type { AreaRow } from "./types";

export const metadata: Metadata = { title: "Manajemen Area" };

export default async function AreasPage() {
  const user = await requirePermission("areas");
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
      <AreasClient areas={areas} />
    </div>
  );
}
