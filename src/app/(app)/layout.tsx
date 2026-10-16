import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        organizationName: user.organization.name,
        roleName: user.role?.name ?? null,
      }}
      permissions={user.permissions}
    >
      {children}
    </AppShell>
  );
}
