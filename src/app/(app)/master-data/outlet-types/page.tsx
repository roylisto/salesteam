import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { notDeleted, outletTypes } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

import { OutletTypesClient } from "./outlet-types-client";
import type { OutletTypeRow } from "./types";

export const metadata: Metadata = { title: "Outlet Types" };

export default async function OutletTypesPage() {
  const user = await requirePermission("outlet_types");
  const { organization } = user;

  const rows = await db
    .select({
      id: outletTypes.id,
      name: outletTypes.name,
      isActive: outletTypes.isActive,
      createdAt: outletTypes.createdAt,
      updatedAt: outletTypes.updatedAt,
    })
    .from(outletTypes)
    .where(
      and(
        eq(outletTypes.organizationId, organization.id),
        notDeleted(outletTypes),
      ),
    )
    .orderBy(asc(outletTypes.name));

  const outletTypesList: OutletTypeRow[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Outlet Types"
        description="Classify outlets by sales channel (Retail, Grosir, Horeca, ...)."
      />
      <OutletTypesClient outletTypes={outletTypesList} />
    </div>
  );
}
