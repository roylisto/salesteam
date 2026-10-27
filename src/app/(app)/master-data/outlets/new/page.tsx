import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadFormOptions } from "../data";
import { OutletForm } from "../outlet-form";

export const metadata: Metadata = { title: "New outlet" };

export default async function NewOutletPage() {
  const user = await requirePermission("outlets");
  const options = await loadFormOptions(user.organization.id);

  return (
    <div className="w-full">
      <PageHeader
        title="New outlet"
        description="Register a customer store with its address, map location and owner details."
      >
        <Button
          render={<Link href="/master-data/outlets" />}
          nativeButton={false}
          variant="outline"
        >
          Back to outlets
        </Button>
      </PageHeader>
      <OutletForm
        outlet={null}
        warehouses={options.warehouses}
        members={options.members}
        outletTypes={options.outletTypes}
      />
    </div>
  );
}
