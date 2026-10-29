import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadTeamData } from "../data";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Anggota baru" };

export default async function NewMemberPage() {
  const user = await requirePermission("team");
  const data = await loadTeamData(user);

  return (
    <div className="w-full">
      <PageHeader
        title="Anggota baru"
        description="Tambahkan anggota tim beserta peran, garis atasan, area, dan gudangnya."
      >
        <Button
          render={<Link href="/settings/team" />}
          nativeButton={false}
          variant="outline"
        >
          Kembali ke tim
        </Button>
      </PageHeader>
      <MemberForm
        roles={data.roles}
        areas={data.areas}
        warehouses={data.warehouses}
        assignableAreas={data.assignableAreas}
        members={data.members}
        isAdmin={data.isAdmin}
      />
    </div>
  );
}
