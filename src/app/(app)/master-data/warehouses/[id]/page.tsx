import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadFormOptions, loadWarehouseDetail } from "../data";
import { WarehouseForm } from "../warehouse-form";

export const metadata: Metadata = { title: "Ubah gudang" };

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("warehouses");
  const { id } = await params;

  const warehouseId = Number(id);
  if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) notFound();

  const [warehouse, options] = await Promise.all([
    loadWarehouseDetail(user.organization.id, warehouseId),
    loadFormOptions(user.organization.id),
  ]);
  if (!warehouse) notFound();

  return (
    <div className="w-full">
      <PageHeader
        title={warehouse.name}
        description="Perbarui area, PIC, wilayah, alamat, dan titik lokasi gudang."
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
        warehouse={warehouse}
        areas={options.areas}
        backOfficeUsers={options.backOfficeUsers}
      />
    </div>
  );
}
