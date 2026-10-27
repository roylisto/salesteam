import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadFormOptions, loadOutletDetail } from "../data";
import { OutletForm } from "../outlet-form";

export const metadata: Metadata = { title: "Ubah outlet" };

export default async function EditOutletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("outlets");
  const { id } = await params;

  const outletId = Number(id);
  if (!Number.isSafeInteger(outletId) || outletId <= 0) notFound();

  const [outlet, options] = await Promise.all([
    loadOutletDetail(user.organization.id, outletId),
    loadFormOptions(user.organization.id),
  ]);
  if (!outlet) notFound();

  return (
    <div className="w-full">
      <PageHeader
        title={outlet.name ?? "Ubah outlet"}
        description="Perbarui profil toko, alamat, lokasi peta, dan detail pemiliknya."
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
        outlet={outlet}
        warehouses={options.warehouses}
        members={options.members}
        outletTypes={options.outletTypes}
      />
    </div>
  );
}
