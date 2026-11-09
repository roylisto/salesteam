import type { Metadata } from "next";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="profile" path="/profile" title="Profil" label="Detail Profil" params={params} />;
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Profil"
        description="Detail akun dan kata sandi Anda."
      />
      <AuditTabs path="/profile" label="Detail Profil" />
      <div className="max-w-3xl">
        <ProfileForm
          name={user.name}
          email={user.email}
          username={user.username}
          code={user.code}
          roleName={user.isAdmin ? "Admin" : (user.role?.name ?? "Belum ditugaskan")}
          organizationName={user.organization.name}
        />
      </div>
    </div>
  );
}
