import type { Metadata } from "next";
import Link from "next/link";

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
  const defaultProvince = params.province ?? null;
  const defaultCity = params.city ?? null;

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
        backOfficeUsers={options.backOfficeUsers}
        defaultProvince={defaultProvince}
        defaultCity={defaultCity}
      />
    </div>
  );
}
