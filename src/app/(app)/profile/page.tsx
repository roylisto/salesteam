import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="w-full">
      <PageHeader
        title="Profil"
        description="Detail akun dan kata sandi Anda."
      />
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
