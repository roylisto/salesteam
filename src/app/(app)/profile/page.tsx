import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="w-full">
      <PageHeader
        title="Profile"
        description="Your account details and password."
      />
      <div className="max-w-3xl">
        <ProfileForm
          name={user.name}
          email={user.email}
          code={user.code}
          roleName={user.isAdmin ? "Admin" : (user.role?.name ?? "Unassigned")}
          organizationName={user.organization.name}
        />
      </div>
    </div>
  );
}
