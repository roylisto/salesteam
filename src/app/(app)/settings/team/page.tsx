import type { Metadata } from "next";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";

import { loadTeamData } from "./data";
import { TeamClient } from "./team-client";

export const metadata: Metadata = { title: "Tim" };

export default async function TeamPage({ searchParams }: PageProps<"/settings/team">) {
  const user = await requirePermission("team");
  const data = await loadTeamData(user);
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="team" path="/settings/team" title="Tim" label="Daftar Tim" params={params} memberIds={data.members.map((member) => member.id)} />;
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Tim"
        description="Kelola garis atasan, area, dan akses untuk organisasi ini."
      />
      <AuditTabs path="/settings/team" label="Daftar Tim" />
      <TeamClient members={data.members} />
    </div>
  );
}
