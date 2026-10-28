import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadFormOptions } from "../data";
import { OutletForm } from "../outlet-form";

export const metadata: Metadata = { title: "Outlet baru" };

interface NewOutletPageProps {
  searchParams: Promise<{ province?: string; city?: string }>;
}

export default async function NewOutletPage({ searchParams }: NewOutletPageProps) {
  const user = await requirePermission("outlets");
  const options = await loadFormOptions(user.organization.id);
  const params = await searchParams;
  const defaultProvince = params.province ?? null;
  const defaultCity = params.city ?? null;

  return (
    <div className="w-full">
      <PageHeader
        title="Outlet baru"
        description="Daftarkan toko pelanggan beserta alamat, lokasi peta, dan detail pemiliknya."
      >
        <Button
          render={<Link href="/master-data/outlets" />}
          nativeButton={false}
          variant="outline"
        >
          Kembali ke outlet
        </Button>
      </PageHeader>
      <OutletForm
        outlet={null}
        warehouses={options.warehouses}
        members={options.members}
        outletTypes={options.outletTypes}
        defaultProvince={defaultProvince}
        defaultCity={defaultCity}
      />
    </div>
  );
}
