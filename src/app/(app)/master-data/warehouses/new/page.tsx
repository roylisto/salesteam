import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, notDeleted } from "@/db/schema";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadFormOptions } from "../data";
import { WarehouseForm } from "../warehouse-form";

export const metadata: Metadata = { title: "Gudang baru" };

interface NewWarehousePageProps {
  searchParams: Promise<{ province?: string; city?: string }>;
}

export default async function NewWarehousePage({ searchParams }: NewWarehousePageProps) {
  const user = await requirePermission("warehouses");
  const options = await loadFormOptions(user.organization.id);
  const params = await searchParams;
  const [headOffice] = await db
    .select({ latitude: organizations.latitude, longitude: organizations.longitude, province: organizations.province, city: organizations.city })
    .from(organizations)
    .where(and(eq(organizations.id, user.organization.id), notDeleted(organizations)))
    .limit(1);
  const defaultProvince = headOffice?.province ?? params.province ?? null;
  const defaultCity = headOffice?.city ?? params.city ?? null;
  const defaultLocation = headOffice?.latitude != null && headOffice.longitude != null &&
    Number.isFinite(headOffice.latitude) && Number.isFinite(headOffice.longitude) &&
    Math.abs(headOffice.latitude) <= 90 && Math.abs(headOffice.longitude) <= 180
    ? { latitude: headOffice.latitude, longitude: headOffice.longitude }
    : null;

  return (
    <div className="w-full">
      <PageHeader
        title="Gudang baru"
        description="Daftarkan gudang beserta area, PIC, wilayah, dan titik lokasinya."
      >
        <Button
          render={<Link href="/master-data/warehouses" />}
          nativeButton={false}
          variant="outline"
        >
          Kembali ke gudang
        </Button>
      </PageHeader>
      <WarehouseForm
        warehouse={null}
        areas={options.areas}
        warehouseTypes={options.warehouseTypes}
        backOfficeUsers={options.backOfficeUsers}
        defaultProvince={defaultProvince}
        defaultCity={defaultCity}
        defaultLocation={defaultLocation}
      />
    </div>
  );
}
