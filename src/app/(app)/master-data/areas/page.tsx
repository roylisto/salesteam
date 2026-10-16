import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { areaOffices } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { AreasClient } from "./areas-client";
import type { AreaRow } from "./types";

export const metadata: Metadata = { title: "Area Management" };

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
    .where(eq(areaOffices.organizationId, organization.id))
    .orderBy(asc(areaOffices.name));

  const areas: AreaRow[] = areaRows.map((area) => ({
    ...area,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Area Management"
        description="Regional groupings for warehouses and outlets in this organization."
      />
      <AreasClient areas={areas} />
    </div>
  );
}
