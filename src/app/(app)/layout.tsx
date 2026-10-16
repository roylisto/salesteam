import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Members still on the system-generated password must pick their own one
  // before they can use the app.
  if (user.mustChangePassword) redirect("/change-password");

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        organizationName: user.organization.name,
        organizationLogoUrl: user.organization.logoUrl,
        roleName: user.role?.name ?? null,
      }}
      permissions={user.permissions}
    >
      {children}
    </AppShell>
  );
}
