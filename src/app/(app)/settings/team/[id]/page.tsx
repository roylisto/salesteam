import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";

import { loadTeamData } from "../data";
import { MemberEditForm } from "../member-edit-form";

export const metadata: Metadata = { title: "Ubah anggota" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("team");
  const { id } = await params;

  const memberId = Number(id);
  if (!Number.isSafeInteger(memberId) || memberId <= 0) notFound();

  const data = await loadTeamData(user);
  // Non-admins only receive their own subtree, so this also guards access.
  const member = data.members.find((item) => item.id === memberId) ?? null;
  if (!member) notFound();

  return (
    <div className="w-full">
      <PageHeader
        title={member.name}
        description="Perbarui profil, peran, garis atasan, area, dan gudang anggota ini."
      >
        <Button
          render={<Link href="/settings/team" />}
          nativeButton={false}
          variant="outline"
        >
          Kembali ke tim
        </Button>
      </PageHeader>
      <MemberEditForm
        member={member}
        roles={data.roles}
        areas={data.areas}
        warehouses={data.warehouses}
        assignableAreas={data.assignableAreas}
        members={data.members}
        currentUserId={data.currentUserId}
        isAdmin={data.isAdmin}
      />
    </div>
  );
}
