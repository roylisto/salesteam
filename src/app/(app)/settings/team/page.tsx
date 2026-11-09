import type { Metadata } from "next";

import { AuditHistoryPage } from "@/components/audit-history";
import { AuditTabs } from "@/components/audit-tabs";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";

import { loadTableQuery, paginateTable } from "@/lib/table-query";
import { loadTeamList, loadVisibleMemberIds } from "./list-data";
import { loadTeamData } from "./data";
import { TeamClient } from "./team-client";

export const metadata: Metadata = { title: "Tim" };

export default async function TeamPage({ searchParams }: PageProps<"/settings/team">) {
  const user = await requirePermission("team");
  const params = await searchParams;
  if (params.tab === "audit") {
    return <AuditHistoryPage user={user} module="team" path="/settings/team" title="Tim" label="Daftar Tim" params={params} memberIds={await loadVisibleMemberIds(user)} />;
  }

  const tab = typeof params.tab === "string" ? params.tab : "all";
  const status = typeof params.status === "string" ? params.status : "all";
  const hierarchy = tab === "hierarchy" ? await loadTeamData(user) : null;
  const list = hierarchy ? {
    rows: [],
    pagination: paginateTable(0, 1, loadTableQuery(params).pageSize),
    counts: {
      backOffice: hierarchy.members.filter((member) => member.userType === "back_office").length,
      sales: hierarchy.members.filter((member) => member.userType === "sales").length,
    },
  } : await loadTeamList(user, params, tab, status);

  return (
    <div className="w-full">
      <PageHeader
        title="Tim"
        description="Kelola garis atasan, area, dan akses untuk organisasi ini."
      />
      <AuditTabs path="/settings/team" label="Daftar Tim" />
      <TeamClient key={hierarchy ? "hierarchy" : "list"} members={list.rows} hierarchyMembers={hierarchy?.members} pagination={list.pagination} counts={list.counts} />
    </div>
  );
}
